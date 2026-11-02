/** A file of the mod rewritten by the companion. */
export interface ModFile {
  /** Path relative to the mod root. */
  readonly relativePath: string;
  readonly content: string;
}

export type PanelState =
  | { readonly kind: 'thinking'; readonly question: string }
  | { readonly kind: 'answered'; readonly question: string; readonly answer: string }
  | { readonly kind: 'failed'; readonly question: string; readonly reason: string };

const LANGUAGES = ['english', 'french'] as const;
type Language = (typeof LANGUAGES)[number];

const LABELS: Readonly<Record<Language, { thinking: string; failed: string }>> = {
  english: { thinking: 'Thinking…', failed: 'Promptitude could not answer:' },
  french: { thinking: 'Réflexion en cours…', failed: 'Promptitude n\'a pas pu répondre :' },
};

/**
 * The panel shows the last question and its answer through two localization keys.
 * Only localization is rewritten: the game reloads it cheaply while it runs.
 */
export function renderAnswerPanel(state: PanelState): ModFile[] {
  return LANGUAGES.map((language) => ({
    relativePath: `main_menu/localization/${language}/promptitude_answer_l_${language}.yml`,
    content: `l_${language}:
 PROMPTITUDE_LAST_QUESTION: "${escapeLocalization(`« ${state.question} »`)}"
 PROMPTITUDE_LAST_ANSWER: "${escapeLocalization(answerText(state, language))}"
`,
  }));
}

function answerText(state: PanelState, language: Language): string {
  switch (state.kind) {
    case 'thinking':
      return LABELS[language].thinking;
    case 'answered':
      return state.answer;
    case 'failed':
      return `${LABELS[language].failed} ${state.reason}`;
  }
}

/** Localization values sit between double quotes on a single line. */
export function escapeLocalization(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replace(/\r?\n/g, '\\n');
}
