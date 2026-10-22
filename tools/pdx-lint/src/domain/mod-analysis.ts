import { extractEvents, type EventFile } from './events/event.js';
import { parseLocalization, type ParsedLocalization } from './localization/localization-file.js';
import { readText, type Mod, type ModFile } from './mod.js';
import type { Block } from './paradox-script/ast.js';
import { parseScript, type ScriptSyntaxError } from './paradox-script/parser.js';

export interface ScriptFile {
  readonly file: ModFile;
  readonly root: Block;
  readonly syntaxErrors: readonly ScriptSyntaxError[];
}

export interface LocalizationFile {
  readonly file: ModFile;
  /** Language folder: `localization/<language>/...`. */
  readonly folderLanguage: string | null;
  /** Language suffix of the file name: `*_l_<language>.yml`. */
  readonly fileNameLanguage: string | null;
  readonly content: ParsedLocalization;
}

/** Parsed view of a mod, computed once and shared by every rule. */
export interface ModAnalysis {
  readonly mod: Mod;
  readonly scripts: readonly ScriptFile[];
  readonly localizations: readonly LocalizationFile[];
  readonly eventFiles: readonly EventFile[];
}

const LOCALIZATION_PATH = /(?:^|\/)localization\/([^/]+)\//;
const LOCALIZATION_FILE_NAME = /_l_([a-z_]+)\.yml$/;

export function analyzeMod(mod: Mod): ModAnalysis {
  const scripts = mod.files.filter(isScript).map((file): ScriptFile => {
    const { root, errors } = parseScript(readText(file));
    return { file, root, syntaxErrors: errors };
  });

  const localizations = mod.files.filter(isLocalization).map(
    (file): LocalizationFile => ({
      file,
      folderLanguage: LOCALIZATION_PATH.exec(file.relativePath)?.[1] ?? null,
      fileNameLanguage: LOCALIZATION_FILE_NAME.exec(file.relativePath)?.[1] ?? null,
      content: parseLocalization(readText(file)),
    }),
  );

  const eventFiles = scripts
    .filter((script) => script.file.relativePath.startsWith('in_game/events/'))
    .map((script) => extractEvents(script.file.relativePath, script.root));

  return { mod, scripts, localizations, eventFiles };
}

export function isScript(file: ModFile): boolean {
  return file.relativePath.endsWith('.txt') && !file.relativePath.startsWith('.metadata/');
}

export function isLocalization(file: ModFile): boolean {
  return file.relativePath.endsWith('.yml') && LOCALIZATION_PATH.test(file.relativePath);
}
