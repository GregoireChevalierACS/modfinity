import type { LintReport, Reporter } from '../ports/reporter.js';

/** Prints `mods/<mod>/<file>:<line>  error  <message>  (<rule>)`, one line per diagnostic. */
export class ConsoleReporter implements Reporter {
  constructor(
    private readonly modsRootLabel: string,
    private readonly write: (line: string) => void = (line) => {
      console.log(line);
    },
  ) {}

  report({ results, errorCount, warningCount, notes }: LintReport): void {
    notes.forEach((note) => {
      this.write(`note: ${note}`);
    });
    for (const { modName, diagnostics } of results) {
      for (const diagnostic of diagnostics) {
        const location = `${this.modsRootLabel}/${modName}/${diagnostic.filePath}${diagnostic.line === undefined ? '' : `:${diagnostic.line}`}`;
        this.write(`${location}  ${diagnostic.severity}  ${diagnostic.message}  (${diagnostic.ruleId})`);
      }
    }
    this.write(`pdx-lint: ${results.length} mod(s) checked, ${errorCount} error(s), ${warningCount} warning(s).`);
  }
}
