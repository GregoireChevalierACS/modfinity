#!/usr/bin/env node
/**
 * Composition root. Run it while playing, with the Promptitude mod enabled:
 *
 *   promptitude [--mod mods/promptitude] [--log <debug.log>] [--model <model>]
 */
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { ClaudeCliProvider, findClaudeExecutable } from './adapters/claude-cli-provider.js';
import { ConsoleReporter } from './adapters/console-reporter.js';
import { DebugLogSource } from './adapters/debug-log-source.js';
import { FileSystemModFileWriter } from './adapters/mod-file-writer.js';
import { CompanionUseCase } from './application/companion.js';

const USER_GAME_DIR = join(homedir(), 'Documents', 'Paradox Interactive', 'Europa Universalis V');

const { values } = parseArgs({
  options: {
    mod: { type: 'string', default: resolve('mods', 'promptitude') },
    log: { type: 'string', default: join(USER_GAME_DIR, 'logs', 'debug.log') },
    model: { type: 'string' },
  },
});

const reporter = new ConsoleReporter();
const executable = await findClaudeExecutable();
reporter.info(`Claude: ${executable}${values.model === undefined ? '' : ` (model ${values.model})`}`);

const log = new DebugLogSource(values.log);
process.on('SIGINT', () => {
  reporter.info('Stopping.');
  log.stop();
});

await new CompanionUseCase(
  log,
  new ClaudeCliProvider(values.model === undefined ? { executable } : { executable, model: values.model }),
  new FileSystemModFileWriter(values.mod),
  reporter,
).run();
