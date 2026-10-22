/**
 * Commit header convention: "YYYY-MM-DD # N : (category) description"
 * e.g. "2026-10-22 # 1 : (chore) ajoute gitignore et editorconfig"
 *
 * @type {import('@commitlint/types').UserConfig}
 */
export default {
  parserPreset: {
    parserOpts: {
      headerPattern: /^(\d{4}-\d{2}-\d{2}) # (\d+) : \((\w+)\) (.+)$/,
      headerCorrespondence: ['date', 'number', 'type', 'subject'],
    },
  },
  plugins: [
    {
      rules: {
        'header-format': ({ header }) => [
          /^\d{4}-\d{2}-\d{2} # \d+ : \(\w+\) .+$/.test(header ?? ''),
          'header must match "YYYY-MM-DD # N : (category) description"',
        ],
        'date-valid': ({ date }) => {
          const parsed = new Date(`${date}T00:00:00Z`);
          const isValid =
            !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(date ?? '');
          return [isValid, `"${date}" is not a valid calendar date`];
        },
        'number-positive': ({ number }) => [
          Number(number) >= 1,
          'commit number of the day must start at 1',
        ],
      },
    },
  ],
  rules: {
    'header-format': [2, 'always'],
    'date-valid': [2, 'always'],
    'number-positive': [2, 'always'],
    'type-empty': [2, 'never'],
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'refactor', 'perf', 'test', 'docs', 'style', 'build', 'ci', 'chore', 'revert'],
    ],
    'subject-empty': [2, 'never'],
    'header-max-length': [2, 'always', 100],
  },
};
