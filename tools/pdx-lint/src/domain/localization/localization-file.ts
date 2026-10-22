export interface LocalizationEntry {
  readonly key: string;
  readonly value: string;
  readonly line: number;
}

export interface LocalizationParseError {
  readonly line: number;
  readonly message: string;
}

export interface ParsedLocalization {
  /** Language declared by the `l_<language>:` header, or null when missing. */
  readonly language: string | null;
  readonly entries: readonly LocalizationEntry[];
  readonly errors: readonly LocalizationParseError[];
}

const HEADER = /^l_([a-z_]+):\s*(#.*)?$/;
// ` key: "value"` or ` key:0 "value"`, optionally followed by a comment.
const ENTRY = /^\s+([\w.\-']+):\d*\s+"(.*)"\s*(#.*)?$/;
const BLANK_OR_COMMENT = /^\s*(#.*)?$/;

export function parseLocalization(source: string): ParsedLocalization {
  const lines = (source.startsWith('﻿') ? source.slice(1) : source).split(/\r?\n/);
  const entries: LocalizationEntry[] = [];
  const errors: LocalizationParseError[] = [];
  let language: string | null = null;

  lines.forEach((text, index) => {
    const line = index + 1;
    if (BLANK_OR_COMMENT.test(text)) return;

    if (language === null) {
      const header = HEADER.exec(text);
      if (header?.[1] !== undefined) {
        language = header[1];
      } else {
        errors.push({ line, message: "expected a language header such as 'l_english:'" });
      }
      return;
    }

    const entry = ENTRY.exec(text);
    if (entry?.[1] !== undefined && entry[2] !== undefined) {
      entries.push({ key: entry[1], value: entry[2], line });
    } else {
      errors.push({ line, message: 'malformed entry, expected \' key: "text"\'' });
    }
  });

  return { language, entries, errors };
}
