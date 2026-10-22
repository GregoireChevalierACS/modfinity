#!/usr/bin/env node
/**
 * Composition root.
 *
 *   pdx-lint [lint] [modsRoot=mods] [--config pdx-lint.config.json] [--docs <dir>] [--game <dir>]
 *   pdx-lint save-baseline [--logs <dir>] [--baselines baselines]
 *   pdx-lint compare-log   [--logs <dir>] [--baselines baselines]
 *
 * Exits with code 1 when errors (lint) or new log errors (compare-log) are found.
 */
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { ConsoleReporter } from './adapters/console-reporter.js';
import { FileSystemBaselineRepository, FileSystemGameLogs } from './adapters/file-system-game-logs.js';
import { FileSystemModRepository } from './adapters/file-system-mod-repository.js';
import { JsonConfigRepository } from './adapters/json-config-repository.js';
import { ScriptDocsKnowledgeRepository } from './adapters/script-docs-knowledge-repository.js';
import { CompareErrorLogUseCase, SaveBaselineUseCase } from './application/error-log.js';
import { LintModsUseCase } from './application/lint-mods.js';

const USER_GAME_DIR = join(homedir(), 'Documents', 'Paradox Interactive', 'Europa Universalis V');
const GAME_INSTALL_DIR = 'C:/Program Files (x86)/Steam/steamapps/common/Europa Universalis V/game';
const COMMANDS = ['lint', 'save-baseline', 'compare-log'] as const;
type Command = (typeof COMMANDS)[number];

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    config: { type: 'string', default: 'pdx-lint.config.json' },
    docs: { type: 'string', default: join(USER_GAME_DIR, 'docs') },
    game: { type: 'string', default: GAME_INSTALL_DIR },
    logs: { type: 'string', default: join(USER_GAME_DIR, 'logs') },
    baselines: { type: 'string', default: 'baselines' },
  },
});

const [first, ...rest] = positionals;
const command: Command = COMMANDS.find((candidate) => candidate === first) ?? 'lint';
const args = command === first ? rest : positionals;
const write = (line: string): void => {
  console.log(line);
};

const gameLogs = new FileSystemGameLogs(values.logs);
const baselines = new FileSystemBaselineRepository(values.baselines);

switch (command) {
  case 'lint': {
    const modsRoot = args[0] ?? 'mods';
    const report = await new LintModsUseCase(
      new FileSystemModRepository(modsRoot),
      new JsonConfigRepository(values.config),
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
    const report = await new CompareErrorLogUseCase(gameLogs, baselines).execute();
    for (const { message, occurrences } of report.newErrors) write(`${String(occurrences).padStart(6)} x ${message}`);
    write(
      `compare-log (${report.gameVersion}): ${report.totalLines} log lines, ${report.newErrors.length} new error message(s) not in the baseline.`,
    );
    process.exitCode = report.newErrors.length > 0 ? 1 : 0;
    break;
  }
}
