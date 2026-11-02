import { buildAdvisorPrompt, fitAnswer } from '../domain/advisor-prompt.js';
import { renderAnswerPanel } from '../domain/answer-panel.js';
import { GameContextTracker } from '../domain/game-context.js';
import type { KnowledgeCard } from '../domain/knowledge/knowledge-card.js';
import { selectKnowledge } from '../domain/knowledge/knowledge-selection.js';
import { parseLogLine } from '../domain/log-events.js';
import type { AnswerProvider, CompanionReporter, GameKnowledgeSource, LogSource, ModFileWriter } from '../ports/ports.js';

/**
 * Answers the prompts typed in the game, one at a time, in the Promptitude panel:
 * "thinking" as soon as the question is seen, then Claude's answer, grounded in knowledge cards
 * built from the game's definitions.
 */
export class CompanionUseCase {
  private readonly context = new GameContextTracker();
  private cards: readonly KnowledgeCard[] = [];

  constructor(
    private readonly log: LogSource,
    private readonly knowledge: GameKnowledgeSource,
    private readonly provider: AnswerProvider,
    private readonly panel: ModFileWriter,
    private readonly reporter: CompanionReporter,
  ) {}

  async run(): Promise<void> {
    this.cards = await this.knowledge.load();
    this.reporter.info(`Game knowledge: ${this.cards.length} cards.`);
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
    const knowledge = selectKnowledge(question, this.cards);
    this.reporter.info(`Question: ${question} (${knowledge.cardCount} knowledge cards)`);
    await this.panel.write(renderAnswerPanel({ kind: 'thinking', question }));

    try {
      const prompt = buildAdvisorPrompt(question, this.context.context, knowledge.text);
      const answer = fitAnswer(await this.provider.answer(prompt));
      await this.panel.write(renderAnswerPanel({ kind: 'answered', question, answer }));
      this.reporter.info(`Answer shown in the panel (${answer.length} characters).`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      await this.panel.write(renderAnswerPanel({ kind: 'failed', question, reason }));
      this.reporter.error(`Could not answer "${question}": ${reason}`);
    }
  }
}
