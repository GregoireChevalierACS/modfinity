const TIMESTAMP = /^\[\d{2}:\d{2}:\d{2}\]/;

export interface NewError {
  readonly message: string;
  readonly occurrences: number;
}

export interface LogComparison {
  readonly totalLines: number;
  /** Messages absent from the baseline, most frequent first. */
  readonly newErrors: readonly NewError[];
}

/** Error messages without timestamps, deduplicated and sorted: the baseline format. */
export function distinctErrors(logText: string): string[] {
  return [...new Set(messages(logText))].sort();
}

export function compareWithBaseline(logText: string, baseline: readonly string[]): LogComparison {
  const known = new Set(baseline);
  const lines = messages(logText);
  const occurrences = new Map<string, number>();
  for (const message of lines) {
    if (!known.has(message)) occurrences.set(message, (occurrences.get(message) ?? 0) + 1);
  }

  const newErrors = [...occurrences]
    .map(([message, count]) => ({ message, occurrences: count }))
    .sort((a, b) => b.occurrences - a.occurrences || a.message.localeCompare(b.message));
  return { totalLines: lines.length, newErrors };
}

function messages(logText: string): string[] {
  return logText
    .split(/\r?\n/)
    .map((line) => line.replace(TIMESTAMP, '').trimEnd())
    .filter((line) => line.trim() !== '');
}
