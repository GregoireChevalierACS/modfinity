import { describe, expect, it } from 'vitest';

import { escapeLocalization, messageTitle, nextMessageId, renderInbox } from '../../src/domain/inbox.js';

describe('nextMessageId', () => {
  const now = new Date(Date.UTC(2026, 0, 1, 1, 0)); // 60 minutes after the id epoch

  it('starts from the minutes elapsed since 2026, so ids grow across restarts', () => {
    expect(nextMessageId(null, now)).toBe(60);
  });

  it('always grows, even within the same minute', () => {
    expect(nextMessageId(60, now)).toBe(61);
    expect(nextMessageId(500, now)).toBe(501);
  });
});

describe('messageTitle', () => {
  it('prefixes short questions', () => {
    expect(messageTitle('Que faire ?')).toBe('Promptitude : Que faire ?');
  });

  it('shortens long questions', () => {
    const title = messageTitle('quel setup de droits de douane me donneraient le plus d\'income sur mon marché actuel ?');

    expect(title.length).toBeLessThanOrEqual('Promptitude : '.length + 48);
    expect(title.endsWith('…')).toBe(true);
  });
});

describe('escapeLocalization', () => {
  it('escapes quotes, backslashes and line breaks', () => {
    expect(escapeLocalization('Il dit "non"\\\nfin')).toBe('Il dit \\"non\\"\\\\\\nfin');
  });
});

describe('renderInbox', () => {
  const files = renderInbox({ id: 42, title: 'Promptitude : test', text: 'Réponse "citée".' });

  it('writes the trigger, the effect and both localizations', () => {
    expect(files.map((file) => file.relativePath)).toEqual([
      'in_game/common/scripted_triggers/promptitude_inbox_triggers.txt',
      'in_game/common/scripted_effects/promptitude_inbox_effects.txt',
      'main_menu/localization/english/promptitude_inbox_l_english.yml',
      'main_menu/localization/french/promptitude_inbox_l_french.yml',
    ]);
  });

  it('uses the message id in the trigger and the effect', () => {
    expect(files[0]?.content).toContain('promptitude_is_unread_message = { ID = 42 }');
    expect(files[1]?.content).toContain('promptitude_mark_message_read_effect = { ID = 42 }');
  });

  it('writes escaped texts under the right language header', () => {
    expect(files[3]?.content).toMatch(/^l_french:\n/);
    expect(files[3]?.content).toContain(' promptitude_inbox.desc: "Réponse \\"citée\\"."');
    expect(files[3]?.content).toContain(' promptitude_inbox.ok: "Compris."');
  });
});
