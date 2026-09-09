/**
 * Curated ICPC-2 subset for pediatric primary care (problem/diagnosis picker).
 * ICPC-2 is the WHO/WONCA classification for primary care — small and
 * clinician-friendly, unlike full ICD-10/SNOMED. `icd10` carries a common
 * mapping for downstream billing where one exists. Extend as needed; this is a
 * starter set covering the most frequent pediatric presentations.
 */
export interface ConditionCode {
  /** ICPC-2 code (e.g. 'R74'). */
  icpc2: string;
  /** Display term (pt-PT). */
  term: string;
  /** ICPC-2 chapter letter (body system). */
  chapter: string;
  /** A common ICD-10 mapping, when one is clear. */
  icd10?: string;
  /** Alternative spellings / lay terms to match on. */
  synonyms?: string[];
}

export const CONDITIONS: ConditionCode[] = [
  { icpc2: 'A03', term: 'Febre', chapter: 'Geral', icd10: 'R50.9', synonyms: ['febril', 'pirexia'] },
  { icpc2: 'A04', term: 'Cansaço / fraqueza geral', chapter: 'Geral', icd10: 'R53' },
  { icpc2: 'A05', term: 'Mal-estar geral', chapter: 'Geral' },
  { icpc2: 'A71', term: 'Sarampo', chapter: 'Geral', icd10: 'B05.9' },
  { icpc2: 'A74', term: 'Rubéola', chapter: 'Geral', icd10: 'B06.9' },
  { icpc2: 'A76', term: 'Exantema viral', chapter: 'Geral', icd10: 'B09', synonyms: ['erupção', 'rash viral'] },
  { icpc2: 'A77', term: 'Doença viral, outra/NE', chapter: 'Geral', icd10: 'B34.9', synonyms: ['virose'] },
  { icpc2: 'D01', term: 'Dor abdominal generalizada', chapter: 'Digestivo', icd10: 'R10.4' },
  { icpc2: 'D10', term: 'Vómitos', chapter: 'Digestivo', icd10: 'R11', synonyms: ['vomito', 'emese'] },
  { icpc2: 'D11', term: 'Diarreia', chapter: 'Digestivo', icd10: 'R19.7' },
  { icpc2: 'D70', term: 'Infeção gastrointestinal', chapter: 'Digestivo', icd10: 'A09' },
  { icpc2: 'D73', term: 'Gastroenterite presumível infecciosa', chapter: 'Digestivo', icd10: 'A09', synonyms: ['gastroenterite', 'gea'] },
  { icpc2: 'D82', term: 'Doença dos dentes / gengivas', chapter: 'Digestivo', icd10: 'K08.9' },
  { icpc2: 'F70', term: 'Conjuntivite infecciosa', chapter: 'Olho', icd10: 'H10.9', synonyms: ['conjuntivite'] },
  { icpc2: 'F73', term: 'Infeção / inflamação ocular, outra', chapter: 'Olho', icd10: 'H10.9' },
  { icpc2: 'H71', term: 'Otite média aguda', chapter: 'Ouvido', icd10: 'H66.9', synonyms: ['otite', 'oma'] },
  { icpc2: 'H72', term: 'Otite média serosa', chapter: 'Ouvido', icd10: 'H65.9' },
  { icpc2: 'H74', term: 'Otite externa', chapter: 'Ouvido', icd10: 'H60.9' },
  { icpc2: 'N07', term: 'Convulsões', chapter: 'Neurológico', icd10: 'R56.9', synonyms: ['convulsão', 'crise convulsiva'] },
  { icpc2: 'N79', term: 'Concussão', chapter: 'Neurológico', icd10: 'S06.0' },
  { icpc2: 'N17', term: 'Vertigem / tonturas', chapter: 'Neurológico', icd10: 'R42' },
  { icpc2: 'P11', term: 'Problema alimentar da criança', chapter: 'Psicológico', icd10: 'R63.3' },
  { icpc2: 'P22', term: 'Problema de comportamento da criança', chapter: 'Psicológico' },
  { icpc2: 'R05', term: 'Tosse', chapter: 'Respiratório', icd10: 'R05' },
  { icpc2: 'R07', term: 'Congestão nasal / espirros', chapter: 'Respiratório', icd10: 'R09.81' },
  { icpc2: 'R74', term: 'Infeção aguda das vias respiratórias superiores', chapter: 'Respiratório', icd10: 'J06.9', synonyms: ['constipação', 'ivas', 'resfriado'] },
  { icpc2: 'R75', term: 'Sinusite', chapter: 'Respiratório', icd10: 'J01.9' },
  { icpc2: 'R76', term: 'Amigdalite aguda', chapter: 'Respiratório', icd10: 'J03.9', synonyms: ['amigdalite', 'faringoamigdalite'] },
  { icpc2: 'R77', term: 'Laringite / traqueíte aguda', chapter: 'Respiratório', icd10: 'J04.2', synonyms: ['laringite', 'crupe'] },
  { icpc2: 'R78', term: 'Bronquite / bronquiolite aguda', chapter: 'Respiratório', icd10: 'J21.9', synonyms: ['bronquiolite', 'bronquite'] },
  { icpc2: 'R81', term: 'Pneumonia', chapter: 'Respiratório', icd10: 'J18.9' },
  { icpc2: 'R96', term: 'Asma', chapter: 'Respiratório', icd10: 'J45.9', synonyms: ['sibilância recorrente'] },
  { icpc2: 'R97', term: 'Rinite alérgica', chapter: 'Respiratório', icd10: 'J30.9' },
  { icpc2: 'S06', term: 'Exantema localizado', chapter: 'Pele', icd10: 'R21' },
  { icpc2: 'S07', term: 'Exantema generalizado', chapter: 'Pele', icd10: 'R21' },
  { icpc2: 'S10', term: 'Furúnculo / abcesso cutâneo', chapter: 'Pele', icd10: 'L02.9' },
  { icpc2: 'S76', term: 'Infeção da pele, outra', chapter: 'Pele', icd10: 'L08.9', synonyms: ['impetigo', 'celulite'] },
  { icpc2: 'S87', term: 'Dermatite atópica / eczema', chapter: 'Pele', icd10: 'L20.9', synonyms: ['eczema', 'dermatite atopica'] },
  { icpc2: 'S88', term: 'Dermatite de contacto / alérgica', chapter: 'Pele', icd10: 'L23.9' },
  { icpc2: 'S89', term: 'Dermatite das fraldas', chapter: 'Pele', icd10: 'L22', synonyms: ['eritema das fraldas'] },
  { icpc2: 'S90', term: 'Pitiríase rósea', chapter: 'Pele', icd10: 'L42' },
  { icpc2: 'T82', term: 'Obesidade', chapter: 'Metabólico', icd10: 'E66.9' },
  { icpc2: 'T83', term: 'Excesso de peso', chapter: 'Metabólico', icd10: 'E66.3' },
  { icpc2: 'U71', term: 'Cistite / infeção urinária', chapter: 'Urinário', icd10: 'N39.0', synonyms: ['itu', 'infeção urinária'] },
  { icpc2: 'A78', term: 'Outra doença infecciosa NE', chapter: 'Geral', icd10: 'B99' },
  { icpc2: 'D70.1', term: 'Oxiuríase (parasitose intestinal)', chapter: 'Digestivo', icd10: 'B80', synonyms: ['oxiúros', 'lombrigas'] },
];
