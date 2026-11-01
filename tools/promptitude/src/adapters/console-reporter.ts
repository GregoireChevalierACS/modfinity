import type { CompanionReporter } from '../ports/ports.js';

export class ConsoleReporter implements CompanionReporter {
  constructor(private readonly clock: () => Date = () => new Date()) {}

  info(message: string): void {
    console.log(`[${this.time()}] ${message}`);
  }

  error(message: string): void {
    console.error(`[${this.time()}] ERROR ${message}`);
  }

  private time(): string {
    return this.clock().toTimeString().slice(0, 8);
  }
}
