import { describe, expect, it } from 'vitest';

import { CompanionUseCase } from '../../src/application/companion.js';
import type { ModFile } from '../../src/domain/answer-panel.js';
import type { KnowledgeCard } from '../../src/domain/knowledge/knowledge-card.js';
import type {
  AnswerProvider,
  CompanionReporter,
  GameKnowledgeSource,
  LogSource,
  ModFileWriter,
} from '../../src/ports/ports.js';

const PROMPT = (text: string) => `[20:49:03][console.cpp:1174]: Running console command: promptitude ${text}`;
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

class FixedKnowledge implements GameKnowledgeSource {
  load(): Promise<KnowledgeCard[]> {
    return Promise.resolve([{ domain: 'goods', id: 'goods_gold', name: 'Or', facts: 'default_market_price=8' }]);
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

class RecordingPanel implements ModFileWriter {
  readonly writes: (readonly ModFile[])[] = [];

  write(files: readonly ModFile[]): Promise<void> {
    this.writes.push(files);
    return Promise.resolve();
  }

  /** French answer text of each write. */
  answers(): string[] {
    return this.writes.map((files) => /LAST_ANSWER: "(.*)"/.exec(files[1]?.content ?? '')?.[1] ?? '');
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

function setup(past: string[], upcoming: string[], failOn?: string) {
  const provider = new EchoProvider(failOn);
  const panel = new RecordingPanel();
  const reporter = new SilentReporter();
  const useCase = new CompanionUseCase(new ScriptedLog(past, upcoming), new FixedKnowledge(), provider, panel, reporter);
  return { useCase, provider, panel, reporter };
}

describe('CompanionUseCase', () => {
  it('shows that it is thinking, then the answer', async () => {
    const { useCase, panel } = setup([], [PROMPT('Que faire ?')]);

    await useCase.run();

    expect(panel.answers()).toEqual(['Réflexion en cours…', 'Réponse n°1']);
  });

  it('uses the country found in the log history', async () => {
    const { useCase, provider } = setup(PROBE, [PROMPT('Que faire ?')]);

    await useCase.run();

    expect(provider.prompts[0]).toContain('Arborée (tag ARB)');
  });

  it('grounds the answer in the knowledge cards relevant to the question', async () => {
    const { useCase, provider } = setup([], [PROMPT('Quel bien vaut le plus cher ?'), PROMPT('Que faire ?')]);

    await useCase.run();

    expect(provider.prompts[0]).toContain('goods_gold (Or): default_market_price=8');
    expect(provider.prompts[1]).not.toContain('goods_gold');
  });

  it('answers every question, in order, without waiting for the game', async () => {
    const { useCase, panel } = setup([], [PROMPT('Première ?'), 'noise', PROMPT('Seconde ?'), PROMPT('Troisième ?')]);

    await useCase.run();

    expect(panel.answers().filter((answer) => answer.startsWith('Réponse'))).toEqual([
      'Réponse n°1',
      'Réponse n°2',
      'Réponse n°3',
    ]);
  });

  it('shows a failure in the panel and goes on with the next question', async () => {
    const { useCase, panel, reporter } = setup([], [PROMPT('casse ?'), PROMPT('Que faire ?')], 'casse');

    await useCase.run();

    expect(reporter.errors).toEqual(['Could not answer "casse ?": quota reached']);
    expect(panel.answers()).toEqual([
      'Réflexion en cours…',
      'Promptitude n\'a pas pu répondre : quota reached',
      'Réflexion en cours…',
      'Réponse n°2',
    ]);
  });

  it('ignores lines that are not prompts', async () => {
    const { useCase, panel } = setup([], ['noise', '[20:39:18][console.cpp:1174]: Running console command: cash']);

    await useCase.run();

    expect(panel.writes).toEqual([]);
  });
});
