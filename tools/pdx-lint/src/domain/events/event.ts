import { properties, walkProperties, type Block, type Property } from '../paradox-script/ast.js';

export interface LocalizationReference {
  readonly key: string;
  readonly line: number;
}

export interface EventDefinition {
  /** Full id, e.g. "modfinity_scholar.1". */
  readonly id: string;
  readonly namespace: string;
  readonly number: number;
  readonly filePath: string;
  readonly line: number;
  readonly localizationKeys: readonly LocalizationReference[];
}

export interface EventFile {
  readonly filePath: string;
  readonly namespaces: readonly string[];
  readonly events: readonly EventDefinition[];
}

const EVENT_ID = /^([A-Za-z_][\w]*)\.(\d+)$/;
const TEXT_FIELDS = ['title', 'desc', 'historical_info'] as const;

export function extractEvents(filePath: string, root: Block): EventFile {
  const namespaces = properties(root, 'namespace').flatMap((property) =>
    property.value.kind === 'scalar' ? [property.value.text] : [],
  );

  const events = root.entries.flatMap((entry): EventDefinition[] => {
    if (entry.kind !== 'property' || entry.value.kind !== 'block') return [];
    const match = EVENT_ID.exec(entry.key);
    if (match?.[1] === undefined || match[2] === undefined) return [];
    return [
      {
        id: entry.key,
        namespace: match[1],
        number: Number(match[2]),
        filePath,
        line: entry.line,
        localizationKeys: isHidden(entry.value) ? [] : localizationReferences(entry.value),
      },
    ];
  });

  return { filePath, namespaces, events };
}

function isHidden(event: Block): boolean {
  return properties(event, 'hidden').some((property) => scalarText(property) === 'yes');
}

function localizationReferences(event: Block): LocalizationReference[] {
  const textReferences = TEXT_FIELDS.flatMap((field) =>
    properties(event, field).flatMap((property) =>
      // Dynamic texts (first_valid / triggered_desc) list their keys in nested `desc` fields.
      property.value.kind === 'block'
        ? [...walkProperties(property.value)].filter((nested) => nested.key === 'desc').flatMap(toReference)
        : toReference(property),
    ),
  );

  const optionReferences = properties(event, 'option').flatMap((option) =>
    option.value.kind === 'block' ? properties(option.value, 'name').flatMap(toReference) : [],
  );

  return [...textReferences, ...optionReferences];
}

function toReference(property: Property): LocalizationReference[] {
  const key = scalarText(property);
  return key === undefined ? [] : [{ key, line: property.line }];
}

function scalarText(property: Property): string | undefined {
  return property.value.kind === 'scalar' ? property.value.text : undefined;
}
