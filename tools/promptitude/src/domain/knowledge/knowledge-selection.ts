import { formatCard, type KnowledgeCard } from './knowledge-card.js';
import { KNOWLEDGE_DOMAINS, type KnowledgeDomain } from './knowledge-domains.js';

/** About 3,000 tokens: keeps each question cheap. */
export const KNOWLEDGE_BUDGET = 12_000;
const MIN_NAME_LENGTH = 4;

export interface KnowledgeSelection {
  readonly text: string;
  readonly cardCount: number;
}

/**
 * Picks the cards relevant to a question, within a character budget:
 * first the definitions named in the question, then whole families matched by keyword.
 */
export function selectKnowledge(
  question: string,
  cards: readonly KnowledgeCard[],
  budget = KNOWLEDGE_BUDGET,
): KnowledgeSelection {
  const words = normalize(question);
  const named = cards.filter((card) => isNamedIn(card, words));
  const families = KNOWLEDGE_DOMAINS.filter((domain) => mentions(domain, words));

  const lines: string[] = [];
  const included = new Set<KnowledgeCard>();
  let used = 0;
  const add = (card: KnowledgeCard, label: string): boolean => {
    if (included.has(card)) return true;
    const line = `- [${label}] ${formatCard(card)}`;
    if (used + line.length + 1 > budget) return false;
    lines.push(line);
    included.add(card);
    used += line.length + 1;
    return true;
  };

  for (const card of named) add(card, domainLabel(card.domain));
  const terms = questionTerms(words);
  for (const domain of families) {
    const domainCards = cards.filter((candidate) => candidate.domain === domain.id);
    for (const card of rankByRelevance(domainCards, terms)) {
      if (!add(card, domain.label)) break;
    }
  }

  return { text: lines.join('\n'), cardCount: included.size };
}

/** Frequent words that say nothing about the subject of a question. */
const STOP_WORDS = new Set([
  'quel', 'quelle', 'quels', 'quelles', 'comment', 'pourquoi', 'pour', 'dans', 'avec', 'plus', 'moins', 'est', 'sont',
  'mon', 'mes', 'notre', 'nos', 'votre', 'vos', 'faire', 'faut', 'peut', 'what', 'which', 'with', 'from', 'that', 'this',
]);
const TERM_PREFIX_LENGTH = 5;

/** Significant words of the question, cut to a prefix so that "republique" matches "republic". */
function questionTerms(words: string): string[] {
  return words
    .trim()
    .split(' ')
    .filter((word) => word.length >= 4 && !STOP_WORDS.has(word))
    .map((word) => word.slice(0, TERM_PREFIX_LENGTH));
}

/** A term found in the name or id of a card counts more than one found in its values. */
const TITLE_WEIGHT = 3;

/** Most relevant first; cards with the same score keep the game's order. */
function rankByRelevance(cards: readonly KnowledgeCard[], terms: readonly string[]): KnowledgeCard[] {
  if (terms.length === 0) return [...cards];
  const score = (card: KnowledgeCard): number => {
    const title = normalize(`${card.id.replaceAll('_', ' ')} ${card.name ?? ''}`);
    const facts = normalize(card.facts);
    return terms.reduce(
      (total, term) => total + (title.includes(term) ? TITLE_WEIGHT : 0) + (facts.includes(term) ? 1 : 0),
      0,
    );
  };
  return cards
    .map((card, index) => ({ card, index, score: score(card) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ card }) => card);
}

/** Lower case, without accents, every non-letter replaced by a space and padded for word matching. */
export function normalize(text: string): string {
  const plain = text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ');
  return ` ${plain.trim()} `;
}

function mentions(domain: KnowledgeDomain, words: string): boolean {
  return domain.keywords.some((keyword) => words.includes(` ${keyword}`));
}

function isNamedIn(card: KnowledgeCard, words: string): boolean {
  const candidates = [card.name, card.id.replaceAll('_', ' ')].filter(
    (candidate): candidate is string => candidate !== null && candidate.length >= MIN_NAME_LENGTH,
  );
  return candidates.some((candidate) => words.includes(normalize(candidate)));
}

function domainLabel(domainId: string): string {
  return KNOWLEDGE_DOMAINS.find((domain) => domain.id === domainId)?.label ?? domainId;
}
