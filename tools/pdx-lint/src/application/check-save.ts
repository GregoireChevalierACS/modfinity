import { CountryScanner } from '../domain/save/country-scanner.js';
import { evaluateSaveCheck, type SaveCheckResult } from '../domain/save/save-check.js';
import type { ConfigRepository } from '../ports/config-repository.js';
import type { SaveGames } from '../ports/save-games.js';

export interface ModSaveCheckResults {
  readonly modName: string;
  readonly results: readonly SaveCheckResult[];
}

export interface SaveCheckReport {
  readonly save: string;
  readonly countryCount: number;
  readonly mods: readonly ModSaveCheckResults[];
  readonly passed: boolean;
}

/** Checks the configured save expectations of each mod against a save (the latest by default). */
export class CheckSaveUseCase {
  constructor(
    private readonly saves: SaveGames,
    private readonly config: ConfigRepository,
  ) {}

  async execute(savePath?: string): Promise<SaveCheckReport> {
    const save = savePath ?? (await this.saves.latest());
    if (save === null) throw new Error('no save found: play the game with the mod, then try again');

    const scanner = new CountryScanner();
    for await (const line of this.saves.readLines(save)) {
      scanner.push(line);
      if (scanner.isDone) break;
    }
    if (scanner.countries.length === 0) {
      throw new Error(`no country found in ${save}: only plain-text saves (not ironman) can be checked`);
    }

    const config = await this.config.load();
    const mods = Object.entries(config.mods)
      .filter(([, modConfig]) => modConfig.saveChecks.length > 0)
      .map(([modName, modConfig]) => ({
        modName,
        results: modConfig.saveChecks.map((check) => evaluateSaveCheck(scanner.countries, check)),
      }));

    return {
      save,
      countryCount: scanner.countries.length,
      mods,
      passed: mods.every((mod) => mod.results.every((result) => result.passed)),
    };
  }
}
