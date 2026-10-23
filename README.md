# modfinity

Mods for **Europa Universalis V** (tested on 1.3.x), built with the tooling and discipline of a regular software project: linting, automated tests, Conventional Commits and a protected `main` branch.

## Layout

```
mods/      one folder per mod (mirrors the game's `game/` folder + `.metadata/`)
tools/     development tooling (e.g. pdx-lint, a static validator for mod files)
scripts/   local helper scripts (linking mods into the game's mod folder…)
```

## Mods

| Mod | Description | Status |
|---|---|---|
| Travelling Scholar | A generic event for every government type: fund a scholar's research, commission praise of your rulers, or send them away. About one visit every 25 years per country, costs scaled on income. | playtest |

## Development

Requirements: Node.js ≥ 22, Git, Europa Universalis V.

```powershell
npm install        # installs dev tooling and git hooks
npm run verify     # lint + typecheck + unit tests + pdx-lint on every mod (also run by CI and pre-push)
npm run lint:mods  # pdx-lint only
```

Link a mod into the game's local mod folder (directory junction, no admin rights):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\link-mod.ps1 -ModName travelling_scholar
```

### pdx-lint

[`tools/pdx-lint`](tools/pdx-lint) statically checks mod files, configured by [`pdx-lint.config.json`](pdx-lint.config.json):

| Rule | Checks |
|---|---|
| `syntax` | Well-formed script (braces, operators, strings) and localization files |
| `utf8-bom` | Script and localization files are UTF-8 with BOM |
| `localization-language` | Folder, `_l_<lang>.yml` suffix and `l_<lang>:` header agree |
| `event-ids` | Declared namespace, number in 1..9999, unique ids |
| `missing-localization` | Every event text exists in each required language |
| `localization-root-scope` | Country data is read through `ROOT.GetCountry` |
| `forbidden-effects` | Per-mod banned effects (e.g. government-specific ones) |
| `unknown-keywords` | Every effect and trigger exists in the game or is scripted in the mod (local only, see below) |

`unknown-keywords` relies on the documentation the game generates with the `script_docs` console command
(`Documents\Paradox Interactive\Europa Universalis V\docs`) and on the vanilla scripted definitions of the
installed game. That data belongs to Paradox and is not committed: without it (e.g. in CI) the rule is skipped with a note.
Override the default locations with `--docs <dir>` and `--game <dir>`.

### Game error log

`error.log` is full of vanilla noise. Compare it with a baseline instead of reading it:

```powershell
npm run baseline     # after a LONG session WITHOUT mods (observe mode, ~15 years): saves baselines/error-log-<version>.txt
npm run compare-log  # after a session WITH mods: new messages, those mentioning a mod file or key listed first
```

`compare-log` fails only on messages attributed to a mod; other new messages are reported as likely vanilla noise.
Vanilla noise depends on what happens in a session, so `baseline` merges each new mod-free session into the existing
baseline (`node tools/pdx-lint/dist/cli.js save-baseline --replace` starts over).

### Save checks

The engine's own `common/tests` are not evaluated in regular (even debug) sessions, so mods are checked on saves instead.
`pdx-lint.config.json` declares, per mod, variables that must be set on at least one existing country of each listed government type:

```powershell
npm run check-save   # scans the latest plain-text save (not ironman) and prints the coverage per government type
```

It follows a hexagonal architecture, enforced by ESLint: `domain` (parsers, rules) has no dependency;
`application` (use case) only depends on `domain` and `ports`; `adapters` (file system, JSON config, console) implement the ports;
`cli.ts` wires everything together.

Commit headers follow the format below, enforced by commitlint:

```
YYYY-MM-DD # N : (category) description
2026-10-22 # 1 : (chore) ajoute gitignore et editorconfig
```

Descriptions are written in French.

- `N`: the commit's number within the day, starting at 1.
- `category`: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `style`, `build`, `ci`, `chore`, `revert`.

## License

[MIT](LICENSE)
