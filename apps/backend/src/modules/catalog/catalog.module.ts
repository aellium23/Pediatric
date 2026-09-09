import { Controller, Get, Injectable, Module, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CONDITIONS, ConditionCode } from './data/conditions';
import { MEDICATIONS, MedicationItem } from './data/medications';
import { VACCINES, VaccineItem } from './data/vaccines';
import { ALLERGENS, AllergenItem } from './data/allergens';

/** Accent/case-insensitive normalisation for forgiving autocomplete matching. */
function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function matches(haystacks: (string | undefined)[], q: string): boolean {
  const n = norm(q);
  return haystacks.some((h) => h && norm(h).includes(n));
}

/**
 * Reference catalogs (ICPC-2 conditions, ATC medications, PNV vaccines,
 * allergens) backing the structured/coded clinical entry. Pure in-memory data
 * — no DB, no external service — so it degrades to nothing and is instant.
 * The goal is autocomplete + coding so users pick instead of typing.
 */
@Injectable()
export class CatalogService {
  searchConditions(q = '', limit = 20): ConditionCode[] {
    if (!q.trim()) return CONDITIONS.slice(0, limit);
    return CONDITIONS.filter((c) => matches([c.term, c.icpc2, c.icd10, ...(c.synonyms ?? [])], q)).slice(
      0,
      limit,
    );
  }

  searchMedications(q = '', limit = 20): MedicationItem[] {
    if (!q.trim()) return MEDICATIONS.slice(0, limit);
    return MEDICATIONS.filter((m) => matches([m.dci, m.atc, ...(m.brands ?? [])], q)).slice(0, limit);
  }

  searchAllergens(q = '', limit = 20): AllergenItem[] {
    if (!q.trim()) return ALLERGENS.slice(0, limit);
    return ALLERGENS.filter((a) => matches([a.term, a.code, ...(a.synonyms ?? [])], q)).slice(0, limit);
  }

  listVaccines(): VaccineItem[] {
    return VACCINES;
  }

  /**
   * Drug-class allergy cross-check: maps each drug allergen to the ATC prefixes
   * it contraindicates, and reports which of the child's recorded allergens
   * clash with a medication's ATC code. A safety prompt, not a hard block —
   * cross-reactivity (e.g. penicillin↔cephalosporin) is intentionally flagged.
   */
  private static readonly ALLERGEN_ATC: Record<string, string[]> = {
    DRUG_PENICILLIN: ['J01C', 'J01CR'], // penicillins (+ combinations)
    DRUG_CEPHALOSPORIN: ['J01D'],
    DRUG_NSAID: ['M01A', 'N02BA'], // NSAIDs + acetylsalicylic acid
    DRUG_SULFA: ['J01E'],
    DRUG_MACROLIDE: ['J01F'],
  };
  // Known cross-reactivity worth surfacing (beta-lactams).
  private static readonly CROSS: Record<string, string[]> = {
    DRUG_PENICILLIN: ['J01D'], // penicillin allergy → caution with cephalosporins
    DRUG_CEPHALOSPORIN: ['J01C', 'J01CR'],
  };

  checkDrugAllergy(allergenCodes: string[], atc: string): { code: string; cross: boolean }[] {
    const a = (atc ?? '').toUpperCase();
    if (!a) return [];
    const hits: { code: string; cross: boolean }[] = [];
    for (const code of allergenCodes ?? []) {
      const direct = CatalogService.ALLERGEN_ATC[code] ?? [];
      if (direct.some((p) => a.startsWith(p))) {
        hits.push({ code, cross: false });
        continue;
      }
      const cross = CatalogService.CROSS[code] ?? [];
      if (cross.some((p) => a.startsWith(p))) hits.push({ code, cross: true });
    }
    return hits;
  }

  /** Vaccines whose scheduled age has been reached for a child of `ageMonths`. */
  dueVaccines(ageMonths: number): { abbr: string; name: string; ageMonths: number }[] {
    if (!Number.isFinite(ageMonths) || ageMonths < 0) return [];
    const due: { abbr: string; name: string; ageMonths: number }[] = [];
    for (const v of VACCINES) {
      for (const age of v.agesMonths) {
        if (age <= ageMonths) due.push({ abbr: v.abbr, name: v.name, ageMonths: age });
      }
    }
    return due.sort((a, b) => a.ageMonths - b.ageMonths);
  }

  /**
   * Suggested dose from the textbook weight reference, if the drug carries one.
   * Always returns the note and a `verify` flag — never a prescription, just a
   * starting point the clinician confirms.
   */
  doseForWeight(atc: string, weightKg: number): {
    found: boolean;
    perDoseMg?: number;
    perDayMg?: number;
    everyHours?: number;
    note?: string;
    verify: boolean;
  } {
    const med = MEDICATIONS.find((m) => m.atc === atc);
    if (!med?.dosing || !(weightKg > 0)) return { found: false, verify: true };
    const d = med.dosing;
    let perDoseMg: number | undefined;
    let perDayMg: number | undefined;
    if (d.mgPerKgDose != null) {
      perDoseMg = Math.round(d.mgPerKgDose * weightKg);
      if (d.maxDoseMg != null) perDoseMg = Math.min(perDoseMg, d.maxDoseMg);
      if (d.everyHours) perDayMg = perDoseMg * Math.round(24 / d.everyHours);
    } else if (d.mgPerKgDay != null) {
      perDayMg = Math.round(d.mgPerKgDay * weightKg);
      if (d.everyHours) {
        const dosesPerDay = Math.round(24 / d.everyHours);
        perDoseMg = Math.round(perDayMg / dosesPerDay);
        if (d.maxDoseMg != null) perDoseMg = Math.min(perDoseMg, d.maxDoseMg);
      }
    }
    return { found: true, perDoseMg, perDayMg, everyHours: d.everyHours, note: d.note, verify: true };
  }
}

@ApiTags('catalog')
@ApiBearerAuth()
@Controller('catalog')
class CatalogController {
  constructor(private readonly service: CatalogService) {}

  @Get('conditions')
  conditions(@Query('q') q?: string) {
    return this.service.searchConditions(q ?? '');
  }

  @Get('medications')
  medications(@Query('q') q?: string) {
    return this.service.searchMedications(q ?? '');
  }

  @Get('allergens')
  allergens(@Query('q') q?: string) {
    return this.service.searchAllergens(q ?? '');
  }

  @Get('vaccines')
  vaccines(@Query('dueByAgeMonths') dueByAgeMonths?: string) {
    if (dueByAgeMonths != null && dueByAgeMonths !== '') {
      return this.service.dueVaccines(parseInt(dueByAgeMonths, 10));
    }
    return this.service.listVaccines();
  }

  @Get('dose')
  dose(@Query('atc') atc: string, @Query('weightKg') weightKg: string) {
    return this.service.doseForWeight(atc ?? '', parseFloat(weightKg ?? ''));
  }

  @Get('drug-allergy')
  drugAllergy(@Query('atc') atc: string, @Query('codes') codes?: string) {
    const list = (codes ?? '').split(',').map((c) => c.trim()).filter(Boolean);
    return this.service.checkDrugAllergy(list, atc ?? '');
  }
}

@Module({
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
