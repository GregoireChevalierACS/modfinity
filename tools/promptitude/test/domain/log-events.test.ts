import { describe, expect, it } from 'vitest';

import { parseLogLine } from '../../src/domain/log-events.js';

describe('parseLogLine', () => {
  it('reads a prompt typed in the game, accents included', () => {
    expect(
      parseLogLine('[20:49:03][console.cpp:1174]: Running console command: promptitude quel RGO rapporterait le plus ?'),
    ).toEqual({ kind: 'prompt', text: 'quel RGO rapporterait le plus ?' });
  });

  it('ignores empty prompts and other console commands', () => {
    expect(parseLogLine('[20:49:03][console.cpp:1174]: Running console command: promptitude ')).toBeNull();
    expect(parseLogLine('[20:49:03][console.cpp:1174]: Running console command: promptitude')).toBeNull();
    expect(parseLogLine('[20:39:18][console.cpp:1174]: Running console command: cash')).toBeNull();
  });

  it('recognizes the state probe and the delivery marker', () => {
    expect(parseLogLine('[20:40:03][jomini_effect_impl.cpp:479]: events/promptitude_probe.txt:16: PROMPTITUDE|state')).toEqual({
      kind: 'state-probe',
    });
    expect(parseLogLine('[20:48:12][jomini_effect_impl.cpp:479]: events/promptitude_inbox.txt:20: PROMPTITUDE|delivered\r')).toEqual({
      kind: 'delivered',
    });
  });

  it('reads the country scope written in French or English', () => {
    expect(parseLogLine('[20:40:03][jomini_effect_impl.cpp:2666]: Pays « Arborée » (ARB)')).toEqual({
      kind: 'scope',
      countryName: 'Arborée',
      tag: 'ARB',
    });
    expect(parseLogLine('[20:40:03][jomini_effect_impl.cpp:2666]: Country "Holy Roman Empire" (HRE)')).toEqual({
      kind: 'scope',
      countryName: 'Holy Roman Empire',
      tag: 'HRE',
    });
  });

  it('ignores unrelated lines', () => {
    expect(parseLogLine('[20:40:02][pdx_gui_data_manager.cpp:362]: FetchData failed')).toBeNull();
  });
});
