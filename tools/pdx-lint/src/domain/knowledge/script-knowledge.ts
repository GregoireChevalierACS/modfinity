import type { Block } from '../paradox-script/ast.js';

/** What the game knows: documented keywords plus vanilla scripted definitions. */
export interface ScriptKnowledge {
  readonly effects: ReadonlySet<string>;
  readonly triggers: ReadonlySet<string>;
  /** Scope links such as `capital`, `owner`, `government_type`. */
  readonly links: ReadonlySet<string>;
  readonly scriptedEffects: ReadonlySet<string>;
  readonly scriptedTriggers: ReadonlySet<string>;
  /** Script values, usable in trigger comparisons (`my_value > 5`). */
  readonly scriptValues: ReadonlySet<string>;
  /** Scripted lists: `courtier` provides `any_courtier`, `every_courtier`, `random_courtier`, `ordered_courtier`. */
  readonly scriptedLists: ReadonlySet<string>;
}

export type ScriptedDefinitionKind = 'scriptedEffects' | 'scriptedTriggers' | 'scriptValues' | 'scriptedLists';

/** Folder (relative to `in_game/` or `main_menu/`) holding each kind of scripted definition. */
export const SCRIPTED_DEFINITION_FOLDERS: Readonly<Record<ScriptedDefinitionKind, string>> = {
  scriptedEffects: 'common/scripted_effects/',
  scriptedTriggers: 'common/scripted_triggers/',
  scriptValues: 'common/script_values/',
  scriptedLists: 'common/scripted_lists/',
};

const INLINE_KEYWORDS: Readonly<Record<string, ScriptedDefinitionKind>> = {
  scripted_effect: 'scriptedEffects',
  scripted_trigger: 'scriptedTriggers',
};

/** Names defined at the top level of a definition file. */
export function definedNames(root: Block): string[] {
  return root.entries.flatMap((entry) => (entry.kind === 'property' ? [entry.key] : []));
}

/** Inline definitions of event files: `scripted_effect my_effect = { ... }`. */
export function inlineDefinitions(root: Block, kind: 'scriptedEffects' | 'scriptedTriggers'): string[] {
  return root.entries.flatMap((entry, index) => {
    const next = root.entries[index + 1];
    const isMarker =
      entry.kind === 'bare' && entry.value.kind === 'scalar' && INLINE_KEYWORDS[entry.value.text] === kind;
    return isMarker && next?.kind === 'property' ? [next.key] : [];
  });
}
