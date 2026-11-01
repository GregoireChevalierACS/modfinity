import { execFile } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

import type { AnswerProvider } from '../ports/ports.js';

export interface ClaudeCliOptions {
  readonly executable: string;
  /** e.g. "claude-haiku-5-5"; the CLI default model when absent. */
  readonly model?: string;
  readonly timeoutMs?: number;
}

/**
 * Asks Claude through the Claude Code CLI in non-interactive mode (`claude -p`), which uses the
 * user's Claude subscription. ANTHROPIC_API_KEY is removed from the child environment so that
 * the answer is never silently billed to an API key.
 */
export class ClaudeCliProvider implements AnswerProvider {
  constructor(private readonly options: ClaudeCliOptions) {}

  answer(prompt: string): Promise<string> {
    const args = ['-p', prompt, '--output-format', 'json', '--max-turns', '1'];
    if (this.options.model !== undefined) args.push('--model', this.options.model);
    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;

    return new Promise((resolve, reject) => {
      execFile(
        this.options.executable,
        args,
        { env, timeout: this.options.timeoutMs ?? 120_000, maxBuffer: 10 * 1024 * 1024, windowsHide: true },
        (error, stdout) => {
          if (error !== null) {
            reject(new Error(`claude CLI failed: ${error.message}`));
            return;
          }
          try {
            resolve(parseCliResult(stdout));
          } catch (parseError) {
            reject(parseError instanceof Error ? parseError : new Error(String(parseError)));
          }
        },
      );
    });
  }
}

export function parseCliResult(stdout: string): string {
  const parsed = JSON.parse(stdout) as { result?: unknown; is_error?: unknown };
  if (parsed.is_error === true || typeof parsed.result !== 'string') {
    throw new Error(`claude CLI returned an error: ${stdout.slice(0, 300)}`);
  }
  return parsed.result;
}

/**
 * Finds the Claude Code executable: PROMPTITUDE_CLAUDE if set, else the newest one shipped
 * with the VS Code extension, else `claude` from the PATH.
 */
export async function findClaudeExecutable(env: NodeJS.ProcessEnv = process.env): Promise<string> {
  const configured = env.PROMPTITUDE_CLAUDE;
  if (configured !== undefined && configured !== '') return configured;

  const extensions = join(homedir(), '.vscode', 'extensions');
  try {
    const candidates = (await readdir(extensions))
      .filter((name) => name.startsWith('anthropic.claude-code-'))
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    const newest = candidates[0];
    if (newest !== undefined) return join(extensions, newest, 'resources', 'native-binary', 'claude.exe');
  } catch {
    // No VS Code extensions folder: fall back to the PATH.
  }
  return 'claude';
}
