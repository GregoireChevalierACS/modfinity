/** A family of game definitions turned into knowledge cards. */
export interface KnowledgeDomain {
  readonly id: string;
  /** Folder under `in_game/common/`. */
  readonly folder: string;
  readonly label: string;
  /**
   * Words (without accents, lower case) that make this whole family relevant to a question.
   * Matched at the start of a word: "reforme" also matches "reformes".
   */
  readonly keywords: readonly string[];
}

export const KNOWLEDGE_DOMAINS: readonly KnowledgeDomain[] = [
  {
    id: 'goods',
    folder: 'goods',
    label: 'Biens (goods)',
    keywords: ['bien', 'marchandise', 'ressource', 'rgo', 'prix', 'produit', 'production', 'good', 'price', 'trade good'],
  },
  {
    id: 'government_reforms',
    folder: 'government_reforms',
    label: 'Réformes de gouvernement (government_reforms)',
    keywords: ['reforme', 'gouvernement', 'republique', 'monarchie', 'theocratie', 'tribu', 'horde', 'reform', 'government', 'republic', 'monarchy'],
  },
  {
    id: 'laws',
    folder: 'laws',
    label: 'Lois et politiques (laws)',
    keywords: ['loi', 'politique', 'law', 'policy'],
  },
  {
    id: 'estate_privileges',
    folder: 'estate_privileges',
    label: 'Privilèges des ordres (estate_privileges)',
    keywords: ['privilege', 'ordre', 'noblesse', 'nobles', 'clerge', 'bourgeois', 'paysan', 'estate'],
  },
  {
    id: 'building_types',
    folder: 'building_types',
    label: 'Bâtiments (building_types)',
    keywords: ['batiment', 'construire', 'construction', 'building', 'build'],
  },
];
