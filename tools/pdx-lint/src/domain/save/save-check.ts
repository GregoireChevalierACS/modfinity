import type { CountrySnapshot } from './country-scanner.js';

/** "Every one of these government types has at least one existing country with this variable." */
export interface SaveCheck {
  readonly variable: string;
  readonly requiredGovernments: readonly string[];
}

export interface GovernmentCoverage {
  readonly governmentType: string;
  readonly existingCountries: number;
  readonly countriesWithVariable: number;
}

export interface SaveCheckResult {
  readonly check: SaveCheck;
  /** One row per government type found among existing countries, plus required ones. */
  readonly coverage: readonly GovernmentCoverage[];
  readonly missingGovernments: readonly string[];
  readonly passed: boolean;
}

export function evaluateSaveCheck(countries: readonly CountrySnapshot[], check: SaveCheck): SaveCheckResult {
  const existing = countries.filter((country) => country.exists && country.governmentType !== null);
  const governments = [
    ...new Set([...existing.map((country) => country.governmentType ?? ''), ...check.requiredGovernments]),
  ].sort();

  const coverage = governments.map((governmentType): GovernmentCoverage => {
    const ofType = existing.filter((country) => country.governmentType === governmentType);
    return {
      governmentType,
      existingCountries: ofType.length,
      countriesWithVariable: ofType.filter((country) => country.variables.has(check.variable)).length,
    };
  });

  const missingGovernments = check.requiredGovernments.filter(
    (required) => (coverage.find((row) => row.governmentType === required)?.countriesWithVariable ?? 0) === 0,
  );
  return { check, coverage, missingGovernments, passed: missingGovernments.length === 0 };
}
