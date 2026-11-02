import { buildAdvisorPrompt, fitAnswer } from '../domain/advisor-prompt.js';
import { renderAnswerPanel } from '../domain/answer-panel.js';
import { GameContextTracker } from '../domain/game-context.js';
import { parseLogLine } from '../domain/log-events.js';
import type { AnswerProvider, CompanionReporter, LogSource, ModFileWriter } from '../ports/ports.js';

/**
 * Answers the prompts typed in the game, one at a time, in the Promptitude panel:
 * "thinking" as soon as the question is seen, then Claude's answer.
 */
export class CompanionUseCase {
  private readonly context = new GameContextTracker();

  constructor(
    private readonly log: LogSource,
    private readonly provider: AnswerProvider,
    private readonly panel: ModFileWriter,
    private readonly reporter: CompanionReporter,
  ) {}

  async run(): Promise<void> {
    for (const line of await this.log.history()) this.context.observe(parseLogLine(line));
    this.reporter.info(`Listening to the game. Country: ${this.context.context.countryName ?? 'unknown yet'}.`);

    for await (const line of this.log.follow()) {
      await this.handle(line);
    }
  }

  async handle(line: string): Promise<void> {
    const event = parseLogLine(line);
    this.context.observe(event);
    if (event?.kind === 'prompt') await this.answer(event.text);
  }

  private async answer(question: string): Promise<void> {
    this.reporter.info(`Question: ${question}`);
    await this.panel.write(renderAnswerPanel({ kind: 'thinking', question }));

    try {
      const answer = fitAnswer(await this.provider.answer(buildAdvisorPrompt(question, this.context.context)));
      await this.panel.write(renderAnswerPanel({ kind: 'answered', question, answer }));
      this.reporter.info(`Answer shown in the panel (${answer.length} characters).`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      await this.panel.write(renderAnswerPanel({ kind: 'failed', question, reason }));
      this.reporter.error(`Could not answer "${question}": ${reason}`);
    }
  }
}
