import { properties, type Block, type Property } from 'pdx-lint/paradox-script';

/** One game definition, summarized on a single line for Claude. */
export interface KnowledgeCard {
  readonly domain: string;
  readonly id: string;
  /** Localized name, or null when the game has none. */
  readonly name: string | null;
  readonly facts: string;
}

/** Conditions and presentation details cost tokens without helping to answer gameplay questions. */
const SKIPPED_BLOCKS = /^(potential|allow|trigger|is_valid|ai_.*|on_.*|color|icon.*|.*_gfx|audio.*)$/;
const SKIPPED_SCALARS = /^(color|icon.*|audio.*|ai_.*)$/;
const MAX_FACTS_LENGTH = 600;

/**
 * Keeps what describes a definition: its top-level values, and the values of its modifier blocks
 * (e.g. `country_modifier`), including those nested in sub-blocks such as the policies of a law.
 */
export function describeDefinition(domain: string, id: string, definition: Block, name: string | null): KnowledgeCard {
  const facts = collectFacts(definition, '').join('; ');
  return {
    domain,
    id,
    name,
    facts: facts.length <= MAX_FACTS_LENGTH ? facts : `${facts.slice(0, MAX_FACTS_LENGTH - 1)}…`,
  };
}

function collectFacts(block: Block, path: string): string[] {
  return properties(block).flatMap((property): string[] => {
    if (property.value.kind === 'scalar') {
      return SKIPPED_SCALARS.test(property.key) ? [] : [`${path}${property.key}${operatorText(property)}${property.value.text}`];
    }
    if (SKIPPED_BLOCKS.test(property.key)) return [];
    if (property.key.endsWith('modifier')) {
      const values = scalarValues(property.value);
      return values.length === 0 ? [] : [`${path}${property.key}: ${values.join(', ')}`];
    }
    // Other blocks (e.g. the policies of a law) are described through their modifiers only.
    return collectFacts(property.value, `${path}${property.key}.`).filter((fact) => fact.includes('modifier:'));
  });
}

function scalarValues(block: Block): string[] {
  return properties(block).flatMap((property) =>
    property.value.kind === 'scalar' ? [`${property.key}${operatorText(property)}${property.value.text}`] : [],
  );
}

function operatorText(property: Property): string {
  return property.operator === '=' ? '=' : ` ${property.operator} `;
}

/** "goods_gold (Or): category=raw_material; default_market_price=8" */
export function formatCard(card: KnowledgeCard): string {
  const name = card.name === null || card.name === card.id ? '' : ` (${card.name})`;
  return `${card.id}${name}: ${card.facts}`;
}
