#!/usr/bin/env node
/**
 * Composition root.
 *
 *   pdx-lint [lint] [modsRoot=mods] [--config pdx-lint.config.json] [--docs <dir>] [--game <dir>]
 *   pdx-lint save-baseline [--logs <dir>] [--baselines baselines]
 *   pdx-lint compare-log   [modsRoot=mods] [--logs <dir>] [--baselines baselines]
 *   pdx-lint check-save    [savePath] [--saves <dir>] [--config pdx-lint.config.json]
 *
 * Exits with code 1 on lint errors, on log errors attributed to a mod, or on a failed save check.
 */
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { ConsoleReporter } from './adapters/console-reporter.js';
import { FileSystemBaselineRepository, FileSystemGameLogs } from './adapters/file-system-game-logs.js';
import { FileSystemModRepository } from './adapters/file-system-mod-repository.js';
import { FileSystemSaveGames } from './adapters/file-system-save-games.js';
import { JsonConfigRepository } from './adapters/json-config-repository.js';
import { ScriptDocsKnowledgeRepository } from './adapters/script-docs-knowledge-repository.js';
import { CheckSaveUseCase } from './application/check-save.js';
import { CompareErrorLogUseCase, SaveBaselineUseCase } from './application/error-log.js';
import { LintModsUseCase } from './application/lint-mods.js';
import type { NewError } from './domain/error-log.js';

const USER_GAME_DIR = join(homedir(), 'Documents', 'Paradox Interactive', 'Europa Universalis V');
const GAME_INSTALL_DIR = 'C:/Program Files (x86)/Steam/steamapps/common/Europa Universalis V/game';
const COMMANDS = ['lint', 'save-baseline', 'compare-log', 'check-save'] as const;
type Command = (typeof COMMANDS)[number];
const UNATTRIBUTED_SHOWN = 10;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    config: { type: 'string', default: 'pdx-lint.config.json' },
    docs: { type: 'string', default: join(USER_GAME_DIR, 'docs') },
    game: { type: 'string', default: GAME_INSTALL_DIR },
    logs: { type: 'string', default: join(USER_GAME_DIR, 'logs') },
    saves: { type: 'string', default: join(USER_GAME_DIR, 'save games') },
    baselines: { type: 'string', default: 'baselines' },
  },
});

const [first, ...rest] = positionals;
const command: Command = COMMANDS.find((candidate) => candidate === first) ?? 'lint';
const args = command === first ? rest : positionals;
const write = (line: string): void => {
  console.log(line);
};
const formatError = ({ message, occurrences }: NewError): string => `${String(occurrences).padStart(6)} x ${message}`;

const config = new JsonConfigRepository(values.config);
const gameLogs = new FileSystemGameLogs(values.logs);
const baselines = new FileSystemBaselineRepository(values.baselines);

switch (command) {
  case 'lint': {
    const modsRoot = args[0] ?? 'mods';
    const report = await new LintModsUseCase(
      new FileSystemModRepository(modsRoot),
      config,
      new ScriptDocsKnowledgeRepository(values.docs, values.game),
      new ConsoleReporter(modsRoot.replaceAll('\\', '/'), write),
    ).execute();
    process.exitCode = report.errorCount > 0 ? 1 : 0;
    break;
  }
  case 'save-baseline': {
    const saved = await new SaveBaselineUseCase(gameLogs, baselines).execute();
    write(`Baseline ${saved.gameVersion} saved to ${saved.location} (${saved.messageCount} distinct messages).`);
    break;
  }
  case 'compare-log': {
    const mods = new FileSystemModRepository(args[0] ?? 'mods');
    const report = await new CompareErrorLogUseCase(gameLogs, baselines, mods).execute();
    for (const { modName, errors } of report.byMod) {
      write(`== ${modName}: ${errors.length} error message(s)`);
      errors.map(formatError).forEach(write);
    }
    if (report.unattributed.length > 0) {
      write(`== not attributed to a mod (likely vanilla, missing from the baseline): ${report.unattributed.length}`);
      report.unattributed.slice(0, UNATTRIBUTED_SHOWN).map(formatError).forEach(write);
      if (report.unattributed.length > UNATTRIBUTED_SHOWN) write('   ...');
    }
    const modErrorCount = report.byMod.reduce((total, mod) => total + mod.errors.length, 0);
    write(
      `compare-log (${report.gameVersion}): ${report.totalLines} log lines, ${modErrorCount} message(s) from mods, ${report.unattributed.length} unattributed.`,
    );
    process.exitCode = modErrorCount > 0 ? 1 : 0;
    break;
  }
  case 'check-save': {
    const report = await new CheckSaveUseCase(new FileSystemSaveGames(values.saves), config).execute(args[0]);
    write(`check-save: ${report.save} (${report.countryCount} countries)`);
    for (const { modName, results } of report.mods) {
      for (const { check, coverage, missingGovernments, passed } of results) {
        write(`== ${modName}: '${check.variable}' ${passed ? 'PASS' : `FAIL (missing: ${missingGovernments.join(', ')})`}`);
        for (const row of coverage) {
          const required = check.requiredGovernments.includes(row.governmentType) ? '*' : ' ';
          write(`  ${required} ${row.governmentType.padEnd(14)} ${String(row.countriesWithVariable).padStart(5)} / ${row.existingCountries} existing countries`);
        }
      }
    }
    process.exitCode = report.passed ? 0 : 1;
    break;
  }
}
