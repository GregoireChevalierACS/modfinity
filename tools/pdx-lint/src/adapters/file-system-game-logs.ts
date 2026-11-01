import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { BaselineRepository, GameLogs } from '../ports/game-logs.js';

/** Written to debug.log at every launch, e.g. "Feeding game version into checksum: 1.4.3". */
const CHECKSUM_VERSION = /Feeding game version into checksum: (\d+(?:\.\d+)+)/;
/** Fallback for release builds: "game_branch: u26q2/release/1.3.11" (not "ud009/release/next"). */
const RELEASE_BRANCH = /game_branch: .*\/release\/(\d+(?:\.\d+)+)/;

/** Reads `<logsDir>/error.log`, and the game version from debug.log or code_revisions.log. */
export class FileSystemGameLogs implements GameLogs {
  constructor(private readonly logsDir: string) {}

  readErrorLog(): Promise<string> {
    return readFile(join(this.logsDir, 'error.log'), 'utf8');
  }

  async readGameVersion(): Promise<string> {
    const version =
      (await this.find('debug.log', CHECKSUM_VERSION)) ?? (await this.find('code_revisions.log', RELEASE_BRANCH));
    if (version === undefined) throw new Error('could not read the game version from debug.log or code_revisions.log');
    return version;
  }

  private async find(logName: string, pattern: RegExp): Promise<string | undefined> {
    try {
      return pattern.exec(await readFile(join(this.logsDir, logName), 'utf8'))?.[1];
    } catch {
      return undefined;
    }
  }
}

/** Stores baselines as `<dir>/error-log-<version>.txt`, one message per line. */
export class FileSystemBaselineRepository implements BaselineRepository {
  constructor(private readonly dir: string) {}

  async load(gameVersion: string): Promise<string[] | null> {
    try {
      const content = await readFile(this.pathFor(gameVersion), 'utf8');
      return content.split(/\r?\n/).filter((line) => line !== '');
    } catch {
      return null;
    }
  }

  async save(gameVersion: string, messages: readonly string[]): Promise<string> {
    const path = this.pathFor(gameVersion);
    await mkdir(this.dir, { recursive: true });
    await writeFile(path, messages.map((message) => `${message}\n`).join(''), 'utf8');
    return path;
  }

  private pathFor(gameVersion: string): string {
    return join(this.dir, `error-log-${gameVersion}.txt`);
  }
}
