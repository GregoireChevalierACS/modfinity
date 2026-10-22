import { analyzeMod, type ModAnalysis } from '../src/domain/mod-analysis.js';
import type { Mod, ModFile } from '../src/domain/mod.js';

const BOM = '﻿';

export function modFile(relativePath: string, content: string, { bom = true } = {}): ModFile {
  return { relativePath, bytes: new TextEncoder().encode((bom ? BOM : '') + content) };
}

export function mod(...files: ModFile[]): Mod {
  return { name: 'test_mod', files };
}

export function analyze(...files: ModFile[]): ModAnalysis {
  return analyzeMod(mod(...files));
}

export const ENGLISH_EVENT_LOC = `l_english:
 test.1.title: "Title"
 test.1.desc: "Description"
 test.1.a: "Option"
`;

export const VALID_EVENT = `namespace = test
test.1 = {
	type = country_event
	title = test.1.title
	desc = test.1.desc
	option = {
		name = test.1.a
	}
}
`;
