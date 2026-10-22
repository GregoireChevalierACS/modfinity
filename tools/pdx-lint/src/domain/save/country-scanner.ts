export interface CountrySnapshot {
  readonly tag: string;
  readonly governmentType: string | null;
  /** A country exists when it owns at least one location. */
  readonly exists: boolean;
  readonly variables: ReadonlySet<string>;
}

interface CountryDraft {
  tag: string;
  governmentType: string | null;
  exists: boolean;
  variables: Set<string>;
}

type State = 'before-countries' | 'in-countries' | 'in-database' | 'done';
type Section = 'government' | 'variables' | null;

const COUNTRY_START = /^\d+=\{$/;
const EMPTY_COUNTRY = /^\d+=none$/;
const COUNTRY_FIELD = /^\t(\w+)=(.*)$/;
const GOVERNMENT_TYPE = /^\t\ttype=(\w+)$/;
const VARIABLE_FLAG = /^\s*flag=(\S+)$/;

/**
 * Extracts countries from a plain-text save, one line at a time (saves weigh hundreds of MB).
 * Countries live in `countries={ database={ <id>={ ... } } }`, their fields indented by one tab.
 */
export class CountryScanner {
  private state: State = 'before-countries';
  private depth = 0;
  private section: Section = null;
  private current: CountryDraft | null = null;
  private readonly scanned: CountrySnapshot[] = [];

  get countries(): readonly CountrySnapshot[] {
    return this.scanned;
  }

  /** True once the countries database has been read entirely: the rest of the save can be skipped. */
  get isDone(): boolean {
    return this.state === 'done';
  }

  push(line: string): void {
    switch (this.state) {
      case 'before-countries':
        if (line === 'countries={') this.state = 'in-countries';
        return;
      case 'in-countries':
        if (line === '\tdatabase={') this.state = 'in-database';
        return;
      case 'in-database':
        this.readDatabaseLine(line);
        return;
      case 'done':
        return;
    }
  }

  private readDatabaseLine(line: string): void {
    if (this.current === null) {
      if (COUNTRY_START.test(line)) {
        this.current = { tag: '?', governmentType: null, exists: false, variables: new Set() };
        this.depth = 1;
      } else if (!EMPTY_COUNTRY.test(line)) {
        this.state = 'done';
      }
      return;
    }

    this.readCountryLine(this.current, line);
    this.depth += braceDelta(line);
    if (this.depth === 1) this.section = null;
    if (this.depth === 0) {
      this.scanned.push(this.current);
      this.current = null;
    }
  }

  private readCountryLine(country: CountryDraft, line: string): void {
    if (this.depth === 1) {
      const [, field, value = ''] = COUNTRY_FIELD.exec(line) ?? [];
      if (field === 'flag') country.tag = value.replaceAll('"', '');
      else if (field === 'owned_locations') country.exists = true;
      else if (field === 'government') this.section = 'government';
      else if (field === 'variables') this.section = 'variables';
      return;
    }
    if (this.section === 'government' && this.depth === 2) {
      const type = GOVERNMENT_TYPE.exec(line)?.[1];
      if (type !== undefined) country.governmentType = type;
    } else if (this.section === 'variables') {
      const flag = VARIABLE_FLAG.exec(line)?.[1];
      if (flag !== undefined) country.variables.add(flag);
    }
  }
}

function braceDelta(line: string): number {
  const unquoted = line.replace(/"[^"]*"/g, '');
  let delta = 0;
  for (const char of unquoted) {
    if (char === '{') delta++;
    else if (char === '}') delta--;
  }
  return delta;
}
