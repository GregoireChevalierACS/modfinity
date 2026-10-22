import { describe, expect, it } from 'vitest';

import { CountryScanner } from '../../../src/domain/save/country-scanner.js';

/** Excerpt shaped like a real EU5 text save. */
const SAVE = `metadata={
	date=1352.4.2
}
variables={
	data={ {
			flag=not_a_country_variable
		} }
}
countries={
	tags={
		0=DUMMY
	}
	database={
0={
	country_name="DUMMY"
	flag="DUMMY"
	government={
		type=monarchy
	}
}
1=none
2={
	flag="FRA"
	country_name="FRA"
	owned_locations={1 2 3}
	score={ "a}b" }
	government={
		type=monarchy
		parliament={
			type=not_the_government_type
		}
	}
	variables={
		data={ {
				flag=modfinity_scholar_cooldown
				tick=3891
			} {
				flag=modfinity_scholar_visited
			} }
	}
}
3={
	flag="VEN"
	owned_locations={4}
	government={
		type=republic
	}
}
	}
}
population={
	flag=ignored_after_countries
}
`;

function scan(save: string): CountryScanner {
  const scanner = new CountryScanner();
  for (const line of save.split('\n')) scanner.push(line);
  return scanner;
}

describe('CountryScanner', () => {
  it('reads tag, government, existence and variables of each country', () => {
    expect(scan(SAVE).countries).toEqual([
      { tag: 'DUMMY', governmentType: 'monarchy', exists: false, variables: new Set() },
      {
        tag: 'FRA',
        governmentType: 'monarchy',
        exists: true,
        variables: new Set(['modfinity_scholar_cooldown', 'modfinity_scholar_visited']),
      },
      { tag: 'VEN', governmentType: 'republic', exists: true, variables: new Set() },
    ]);
  });

  it('is done after the countries database, so the rest of the save can be skipped', () => {
    const scanner = new CountryScanner();
    const lines = SAVE.split('\n');
    const doneAt = lines.findIndex((line) => {
      scanner.push(line);
      return scanner.isDone;
    });

    expect(lines[doneAt]).toBe('\t}');
  });

  it('finds nothing in a file without countries section', () => {
    expect(scan('metadata={\n}\n').countries).toEqual([]);
  });
});
