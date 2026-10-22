import { describe, expect, it } from 'vitest';

import { extractEvents } from '../../../src/domain/events/event.js';
import { parseScript } from '../../../src/domain/paradox-script/parser.js';
import { VALID_EVENT } from '../../helpers.js';

function extract(source: string) {
  return extractEvents('in_game/events/test.txt', parseScript(source).root);
}

describe('extractEvents', () => {
  it('reads namespaces and events with their id parts', () => {
    const file = extract(VALID_EVENT);

    expect(file.namespaces).toEqual(['test']);
    expect(file.events).toMatchObject([{ id: 'test.1', namespace: 'test', number: 1, line: 2 }]);
  });

  it('collects title, desc and option names as localization keys', () => {
    const [event] = extract(VALID_EVENT).events;

    expect(event?.localizationKeys).toEqual([
      { key: 'test.1.title', line: 4 },
      { key: 'test.1.desc', line: 5 },
      { key: 'test.1.a', line: 7 },
    ]);
  });

  it('collects keys of dynamic descriptions', () => {
    const [event] = extract(`test.1 = {
	desc = {
		first_valid = {
			triggered_desc = { trigger = { always = yes } desc = test.1.desc.a }
			triggered_desc = { desc = test.1.desc.b }
		}
	}
}`).events;

    expect(event?.localizationKeys.map((reference) => reference.key)).toEqual(['test.1.desc.a', 'test.1.desc.b']);
  });

  it('expects no localization for hidden events', () => {
    const [event] = extract('test.1 = { hidden = yes title = test.1.title }').events;

    expect(event?.localizationKeys).toEqual([]);
  });

  it('ignores top-level blocks that are not events', () => {
    const file = extract('scripted_trigger my_trigger = { always = yes }\nnot_an_event = { }');

    expect(file.events).toEqual([]);
  });
});
