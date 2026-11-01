import { buildAdvisorPrompt, fitAnswer } from '../domain/advisor-prompt.js';
import { GameContextTracker } from '../domain/game-context.js';
import { messageTitle, nextMessageId, renderInbox } from '../domain/inbox.js';
import { parseLogLine } from '../domain/log-events.js';
import type { AnswerProvider, Clock, CompanionReporter, Inbox, LogSource } from '../ports/ports.js';

/** Past this delay, a message never shown in game (game closed, loaded save...) is replaced anyway. */
export const DELIVERY_TIMEOUT_MS = 10 * 60_000;

/**
 * Answers the prompts typed in the game, one at a time: a new answer is written only once the
 * previous one has been shown in game, so that the single-message inbox never loses an answer.
 */
export class CompanionUseCase {
  private readonly context = new GameContextTracker();
  private readonly pending: string[] = [];
  private lastMessageId: number | null = null;
  private awaitingDeliverySince: Date | null = null;

  constructor(
    private readonly log: LogSource,
    private readonly provider: AnswerProvider,
    private readonly inbox: Inbox,
    private readonly reporter: CompanionReporter,
    private readonly clock: Clock = () => new Date(),
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

    if (event?.kind === 'prompt') {
      this.reporter.info(`Question: ${event.text}`);
      this.pending.push(event.text);
    } else if (event?.kind === 'delivered' && this.awaitingDeliverySince !== null) {
      this.reporter.info('Answer shown in game.');
      this.awaitingDeliverySince = null;
    }

    await this.answerNextIfInboxFree();
  }

  private async answerNextIfInboxFree(): Promise<void> {
    if (this.awaitingDeliverySince !== null) {
      const waited = this.clock().getTime() - this.awaitingDeliverySince.getTime();
      if (waited < DELIVERY_TIMEOUT_MS) return;
      this.reporter.info('Previous answer never shown in game: replacing it.');
    }

    const question = this.pending.shift();
    if (question === undefined) return;

    try {
      const answer = fitAnswer(await this.provider.answer(buildAdvisorPrompt(question, this.context.context)));
      const id = nextMessageId(this.lastMessageId, this.clock());
      await this.inbox.write(renderInbox({ id, title: messageTitle(question), text: answer }));
      this.lastMessageId = id;
      this.awaitingDeliverySince = this.clock();
      this.reporter.info(`Answer ${id} sent to the game (${answer.length} characters).`);
    } catch (error) {
      this.reporter.error(`Could not answer "${question}": ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
