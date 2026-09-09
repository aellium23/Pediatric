/**
 * Curated allergen picker for the child's allergy list. `category` groups the
 * common pediatric allergens (drug / food / environmental). Starter set —
 * extend as needed.
 */
export interface AllergenItem {
  code: string;
  term: string;
  category: 'farmaco' | 'alimento' | 'ambiental';
  synonyms?: string[];
}

export const ALLERGENS: AllergenItem[] = [
  { code: 'DRUG_PENICILLIN', term: 'Penicilinas', category: 'farmaco', synonyms: ['amoxicilina', 'penicilina'] },
  { code: 'DRUG_CEPHALOSPORIN', term: 'Cefalosporinas', category: 'farmaco' },
  { code: 'DRUG_NSAID', term: 'Anti-inflamatórios (AINEs)', category: 'farmaco', synonyms: ['ibuprofeno', 'aspirina'] },
  { code: 'DRUG_SULFA', term: 'Sulfamidas', category: 'farmaco' },
  { code: 'DRUG_MACROLIDE', term: 'Macrólidos', category: 'farmaco', synonyms: ['azitromicina'] },
  { code: 'FOOD_MILK', term: 'Leite de vaca', category: 'alimento', synonyms: ['lactose', 'proteína do leite'] },
  { code: 'FOOD_EGG', term: 'Ovo', category: 'alimento' },
  { code: 'FOOD_PEANUT', term: 'Amendoim', category: 'alimento' },
  { code: 'FOOD_TREENUT', term: 'Frutos de casca rija', category: 'alimento', synonyms: ['nozes', 'avelã', 'amêndoa'] },
  { code: 'FOOD_FISH', term: 'Peixe', category: 'alimento' },
  { code: 'FOOD_SHELLFISH', term: 'Marisco', category: 'alimento' },
  { code: 'FOOD_SOY', term: 'Soja', category: 'alimento' },
  { code: 'FOOD_WHEAT', term: 'Trigo / glúten', category: 'alimento', synonyms: ['glúten'] },
  { code: 'FOOD_SESAME', term: 'Sésamo', category: 'alimento' },
  { code: 'ENV_DUSTMITE', term: 'Ácaros do pó', category: 'ambiental' },
  { code: 'ENV_POLLEN', term: 'Pólenes', category: 'ambiental', synonyms: ['gramíneas'] },
  { code: 'ENV_CAT', term: 'Pelo de gato', category: 'ambiental' },
  { code: 'ENV_DOG', term: 'Pelo de cão', category: 'ambiental' },
  { code: 'ENV_INSECT', term: 'Picada de inseto', category: 'ambiental', synonyms: ['abelha', 'vespa'] },
  { code: 'ENV_LATEX', term: 'Látex', category: 'ambiental' },
];
