import { describe, expect, it } from 'vitest';

import { CompanionUseCase, DELIVERY_TIMEOUT_MS } from '../../src/application/companion.js';
import type { InboxFile } from '../../src/domain/inbox.js';
import type { AnswerProvider, CompanionReporter, Inbox, LogSource } from '../../src/ports/ports.js';

const PROMPT = (text: string) => `[20:49:03][console.cpp:1174]: Running console command: promptitude ${text}`;
const DELIVERED = '[20:48:12][jomini_effect_impl.cpp:479]: events/promptitude_inbox.txt:20: PROMPTITUDE|delivered';
const PROBE = [
  '[20:40:03][jomini_effect_impl.cpp:479]: events/promptitude_probe.txt:16: PROMPTITUDE|state',
  '[20:40:03][jomini_effect_impl.cpp:2666]: Pays « Arborée » (ARB)',
];

class ScriptedLog implements LogSource {
  constructor(
    private readonly past: string[],
    private readonly upcoming: string[],
  ) {}

  history(): Promise<string[]> {
    return Promise.resolve(this.past);
  }

  async *follow(): AsyncIterable<string> {
    for (const line of this.upcoming) {
      await Promise.resolve();
      yield line;
    }
  }

  stop(): void {
    // Finite script: nothing to stop.
  }
}

class EchoProvider implements AnswerProvider {
  readonly prompts: string[] = [];

  constructor(private readonly failOn?: string) {}

  answer(prompt: string): Promise<string> {
    this.prompts.push(prompt);
    if (this.failOn !== undefined && prompt.includes(this.failOn)) return Promise.reject(new Error('quota reached'));
    return Promise.resolve(`Réponse n°${this.prompts.length}`);
  }
}

class RecordingInbox implements Inbox {
  readonly writes: (readonly InboxFile[])[] = [];

  write(files: readonly InboxFile[]): Promise<void> {
    this.writes.push(files);
    return Promise.resolve();
  }

  descriptions(): string[] {
    return this.writes.map((files) => /desc: "(.*)"/.exec(files[3]?.content ?? '')?.[1] ?? '');
  }
}

class SilentReporter implements CompanionReporter {
  readonly errors: string[] = [];

  info(): void {
    // Not asserted.
  }

  error(message: string): void {
    this.errors.push(message);
  }
}

function setup(past: string[], upcoming: string[], { failOn, clock }: { failOn?: string; clock?: () => Date } = {}) {
  const provider = new EchoProvider(failOn);
  const inbox = new RecordingInbox();
  const reporter = new SilentReporter();
  const useCase = new CompanionUseCase(new ScriptedLog(past, upcoming), provider, inbox, reporter, clock);
  return { useCase, provider, inbox, reporter };
}

describe('CompanionUseCase', () => {
  it('answers a prompt typed in game and writes the answer to the inbox', async () => {
    const { useCase, inbox } = setup([], [PROMPT('Que faire ?')]);

    await useCase.run();

    expect(inbox.descriptions()).toEqual(['Réponse n°1']);
  });

  it('uses the country found in the log history', async () => {
    const { useCase, provider } = setup(PROBE, [PROMPT('Que faire ?')]);

    await useCase.run();

    expect(provider.prompts[0]).toContain('Arborée (tag ARB)');
  });

  it('waits for the previous answer to be shown before writing the next one', async () => {
    const { useCase, inbox } = setup([], [PROMPT('Première ?'), PROMPT('Seconde ?'), 'noise', DELIVERED, 'noise']);

    await useCase.run();

    expect(inbox.descriptions()).toEqual(['Réponse n°1', 'Réponse n°2']);
  });

  it('keeps the second answer pending while the first one is not shown', async () => {
    const { useCase, inbox } = setup([], [PROMPT('Première ?'), PROMPT('Seconde ?'), 'noise']);

    await useCase.run();

    expect(inbox.writes).toHaveLength(1);
  });

  it('replaces an answer never shown after the delivery timeout', async () => {
    let now = new Date(Date.UTC(2026, 10, 1, 20, 0));
    const clock = () => now;
    const { useCase, inbox } = setup([], [], { clock });

    await useCase.handle(PROMPT('Première ?'));
    await useCase.handle(PROMPT('Seconde ?'));
    expect(inbox.writes).toHaveLength(1);
    now = new Date(now.getTime() + DELIVERY_TIMEOUT_MS);
    await useCase.handle('noise');

    expect(inbox.writes).toHaveLength(2);
  });

  it('gives growing message ids', async () => {
    const { useCase, inbox } = setup([], [PROMPT('A ?'), DELIVERED, PROMPT('B ?')]);

    await useCase.run();

    const ids = inbox.writes.map((files) => Number(/ID = (\d+)/.exec(files[0]?.content ?? '')?.[1]));
    expect(ids[1]).toBeGreaterThan(ids[0] ?? Infinity);
  });

  it('reports a failed answer and goes on with the next prompt', async () => {
    const { useCase, inbox, reporter } = setup([], [PROMPT('casse ?'), PROMPT('Que faire ?')], { failOn: 'casse' });

    await useCase.run();

    expect(reporter.errors).toEqual(['Could not answer "casse ?": quota reached']);
    expect(inbox.writes).toHaveLength(1);
  });
});
