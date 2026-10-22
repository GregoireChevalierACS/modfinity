#!/usr/bin/env node
/**
 * Composition root.
 * Usage: pdx-lint [modsRoot=mods] [--config pdx-lint.config.json]
 * Exits with code 1 when at least one error is found.
 */
import { parseArgs } from 'node:util';

import { ConsoleReporter } from './adapters/console-reporter.js';
import { FileSystemModRepository } from './adapters/file-system-mod-repository.js';
import { JsonConfigRepository } from './adapters/json-config-repository.js';
import { LintModsUseCase } from './application/lint-mods.js';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { config: { type: 'string', default: 'pdx-lint.config.json' } },
});
const modsRoot = positionals[0] ?? 'mods';

const useCase = new LintModsUseCase(
  new FileSystemModRepository(modsRoot),
  new JsonConfigRepository(values.config),
  new ConsoleReporter(modsRoot.replaceAll('\\', '/')),
);

const report = await useCase.execute();
process.exitCode = report.errorCount > 0 ? 1 : 0;
