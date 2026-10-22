const UTF8_BOM = [0xef, 0xbb, 0xbf] as const;

export interface ModFile {
  /** Path relative to the mod root, with forward slashes. */
  readonly relativePath: string;
  readonly bytes: Uint8Array;
}

export interface Mod {
  /** Folder name of the mod, e.g. "travelling_scholar". */
  readonly name: string;
  readonly files: readonly ModFile[];
}

export function hasUtf8Bom(file: ModFile): boolean {
  return UTF8_BOM.every((byte, index) => file.bytes[index] === byte);
}

/** Decodes the file as UTF-8; a leading BOM is dropped. */
export function readText(file: ModFile): string {
  return new TextDecoder('utf-8').decode(file.bytes);
}
