import { describe, expect, it } from 'vitest';

import type { CountrySnapshot } from '../../../src/domain/save/country-scanner.js';
import { evaluateSaveCheck } from '../../../src/domain/save/save-check.js';

function country(governmentType: string, { exists = true, visited = false } = {}): CountrySnapshot {
  return { tag: 'TAG', governmentType, exists, variables: new Set(visited ? ['visited'] : []) };
}

const check = { variable: 'visited', requiredGovernments: ['monarchy', 'republic'] };

describe('evaluateSaveCheck', () => {
  it('passes when every required government has a visited existing country', () => {
    const result = evaluateSaveCheck(
      [country('monarchy', { visited: true }), country('monarchy'), country('republic', { visited: true })],
      check,
    );

    expect(result.passed).toBe(true);
    expect(result.coverage).toEqual([
      { governmentType: 'monarchy', existingCountries: 2, countriesWithVariable: 1 },
      { governmentType: 'republic', existingCountries: 1, countriesWithVariable: 1 },
    ]);
  });

  it('fails and names the governments never visited', () => {
    const result = evaluateSaveCheck([country('monarchy', { visited: true }), country('republic')], check);

    expect(result.passed).toBe(false);
    expect(result.missingGovernments).toEqual(['republic']);
  });

  it('ignores countries that no longer exist', () => {
    const result = evaluateSaveCheck(
      [country('monarchy', { visited: true }), country('republic', { exists: false, visited: true })],
      check,
    );

    expect(result.missingGovernments).toEqual(['republic']);
    expect(result.coverage).toContainEqual({ governmentType: 'republic', existingCountries: 0, countriesWithVariable: 0 });
  });

  it('also reports governments that are not required', () => {
    const result = evaluateSaveCheck(
      [country('monarchy', { visited: true }), country('republic', { visited: true }), country('tribe')],
      check,
    );

    expect(result.coverage.map((row) => row.governmentType)).toEqual(['monarchy', 'republic', 'tribe']);
  });
});
