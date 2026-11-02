import { describe, expect, it } from 'vitest';

import { escapeLocalization, renderAnswerPanel } from '../../src/domain/answer-panel.js';

describe('renderAnswerPanel', () => {
  it('writes the panel texts for both languages, as localization only', () => {
    const files = renderAnswerPanel({ kind: 'answered', question: 'Que faire ?', answer: 'Attendez.' });

    expect(files.map((file) => file.relativePath)).toEqual([
      'main_menu/localization/english/promptitude_answer_l_english.yml',
      'main_menu/localization/french/promptitude_answer_l_french.yml',
    ]);
    expect(files[1]?.content).toBe(`l_french:
 PROMPTITUDE_LAST_QUESTION: "« Que faire ? »"
 PROMPTITUDE_LAST_ANSWER: "Attendez."
`);
  });

  it('shows that Claude is thinking, in the game language', () => {
    const files = renderAnswerPanel({ kind: 'thinking', question: 'Q ?' });

    expect(files[0]?.content).toContain('PROMPTITUDE_LAST_ANSWER: "Thinking…"');
    expect(files[1]?.content).toContain('PROMPTITUDE_LAST_ANSWER: "Réflexion en cours…"');
  });

  it('explains a failure', () => {
    const files = renderAnswerPanel({ kind: 'failed', question: 'Q ?', reason: 'quota reached' });

    expect(files[1]?.content).toContain('PROMPTITUDE_LAST_ANSWER: "Promptitude n\'a pas pu répondre : quota reached"');
  });

  it('escapes the question and the answer', () => {
    const files = renderAnswerPanel({ kind: 'answered', question: 'Il dit "non"', answer: 'ligne 1\nligne 2' });

    expect(files[0]?.content).toContain('PROMPTITUDE_LAST_QUESTION: "« Il dit \\"non\\" »"');
    expect(files[0]?.content).toContain('PROMPTITUDE_LAST_ANSWER: "ligne 1\\nligne 2"');
  });
});

describe('escapeLocalization', () => {
  it('escapes quotes, backslashes and line breaks', () => {
    expect(escapeLocalization('Il dit "non"\\\r\nfin')).toBe('Il dit \\"non\\"\\\\\\nfin');
  });
});
