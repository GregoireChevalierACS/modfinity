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
| Travelling Scholar | A generic event for every government type: fund a scholar's research, commission praise of your rulers, or send them away. | planned |

## Development

Requirements: Node.js ≥ 22, Git, Europa Universalis V.

```powershell
npm install   # installs dev tooling and git hooks
```

Commit headers follow the format below, enforced by commitlint:

```
YYYY-MM-DD # N : (category) description
2026-10-22 # 1 : (chore) add gitignore and editorconfig
```

- `N`: the commit's number within the day, starting at 1.
- `category`: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `style`, `build`, `ci`, `chore`, `revert`.

## License

[MIT](LICENSE)
