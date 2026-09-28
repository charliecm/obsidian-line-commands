# Obsidian community plugin

## Project overview

- Target: Obsidian Community Plugin (TypeScript → bundled JavaScript).
- Entry point: `src/main.ts` compiled to `main.js` and loaded by Obsidian.
- Required release artifacts: `main.js`, `manifest.json`, and optional `styles.css` (this plugin currently has no `styles.css`).

## Environment & tooling

- Node.js: use current LTS (Node 20+).
- **Package manager: npm** (`package.json` defines npm scripts and dependencies).
- **Bundler: esbuild** (`esbuild.config.mjs` and build scripts depend on it).
- Types: `obsidian` type definitions.

### Install

```bash
npm install
```

### Dev (watch)

```bash
npm run dev
```

### Production build

```bash
npm run build
```

### Link build output into a local vault

```bash
bash install-built.sh /path/to/your/vault -d
```

Symlinks (or with no `-d`, copies) `main.js` and `manifest.json` into `<Vault>/.obsidian/plugins/line-commands/` and reloads the plugin via the Obsidian CLI. Runs `npm run build` first if the target vault exists.

## Linting

- ESLint is preconfigured with `eslint-plugin-obsidianmd` for Obsidian-specific rules, via flat config (`eslint.config.mts`).
- Run `npm run lint` to lint the project.
- A GitHub Action (`lint.yml`) lints and tests every commit on all branches.

## Testing

- Unit tests live alongside source in `src/main.test.ts` and use **Vitest**, mocking the `obsidian` module.
- Run `npm test` (single run) or `npm run test:watch` (watch mode).
- CI runs `npm test` on every push/PR alongside build and lint.
- For manual/integration testing, install into a real vault via `install-built.sh` (see above), reload Obsidian, and enable the plugin in **Settings → Community plugins**.

## File & folder conventions

- Source lives in `src/`. This plugin is intentionally small and single-purpose (editor commands only — no settings tab, no ribbon icon, no UI), so it currently stays as:
    ```
    src/
      main.ts        # Plugin entry point: registers all editor commands
      main.test.ts    # Vitest suite covering command behavior
    ```
- If the plugin grows meaningfully (e.g. gains settings or multiple concerns), split out modules (`commands/`, `utils/`) rather than letting `main.ts` grow unbounded — see the sample plugin scaffold's convention at https://github.com/obsidianmd/obsidian-sample-plugin for the fuller pattern.
- **Do not commit build artifacts**: never commit `node_modules/`, `main.js`, `package-lock.json` changes unrelated to your change, or other generated files.
- Keep the plugin small. Avoid large dependencies. Prefer browser-compatible packages.

## Manifest rules (`manifest.json`)

- Must include (non-exhaustive):
    - `id` (plugin ID; for local dev it should match the folder name)
    - `name`
    - `version` (Semantic Versioning `x.y.z`)
    - `minAppVersion`
    - `description`
    - `isDesktopOnly` (boolean)
    - Optional: `author`, `authorUrl`, `fundingUrl` (string or map)
- Never change `id` after release. Treat it as stable API.
- Keep `minAppVersion` accurate when using newer APIs.
- Canonical requirements are coded here: https://github.com/obsidianmd/obsidian-releases/blob/master/.github/workflows/validate-plugin-entry.yml

## Commands

- Every user-facing command is added via `this.addCommand(...)` in `src/main.ts`'s `onload()`.
- Use stable command IDs; never rename an existing command's `id` once released — that breaks users' saved hotkeys.
- This plugin has no settings/persisted data (`loadData`/`saveData` are unused).

## Versioning & releases

- Bump `version` in `manifest.json` (SemVer) and update `versions.json` to map plugin version → minimum app version — done via `npm version [patch|minor|major]`, which runs `version-bump.mjs` and stages both files.
- Add changes to `CHANGELOG.md`.
- Create a GitHub release whose tag exactly matches `manifest.json`'s `version` (no leading `v`). Pushing the tag triggers `release.yml`, which builds, attests provenance, and creates a draft release.
- Attach/verify `manifest.json`, `main.js`, and `styles.css` (if present) on the release, then edit in the changelog text and publish.

### Beta releases (BRAT)

- Testers install betas with [BRAT](https://tfthacker.com/brat-developers), which reads `manifest.json` from the release assets and picks the highest release or pre-release by SemVer.
- Never put a beta version in `manifest.json`, `versions.json`, or `package.json` on `main` — Obsidian reads the root `manifest.json` on the default branch, so regular users would be offered the beta.
- Cut a beta from a throwaway branch so the version bump never lands in the feature branch:
    ```bash
    git switch -c beta/1.4.0-beta.1 feature/my-feature
    npm version 1.4.0-beta.1   # commits and tags 1.4.0-beta.1 (no `v` prefix, see .npmrc)
    git push origin 1.4.0-beta.1
    git switch - && git branch -D beta/1.4.0-beta.1
    ```
- A tag with a `-` suffix makes `release.yml` create a draft **pre-release** with the `## Unreleased` changelog section as notes, so keep that section in `CHANGELOG.md` for betas. Publish the draft to make it visible to BRAT.
- Increment the suffix for each new beta (`-beta.2`, …). After the stable release, tell testers to remove the plugin from BRAT and reinstall from Community plugins, since Obsidian may not upgrade from a pre-release automatically.

## Security, privacy, and compliance

Follow Obsidian's **Developer Policies** and **Plugin Guidelines**. In particular:

- This plugin is fully local/offline — it only reads/writes the active editor and the system clipboard. Keep it that way; do not add network requests without explicit disclosure.
- No hidden telemetry.
- Never execute remote code, fetch and eval scripts, or auto-update plugin code outside of normal releases.
- Minimize scope: only touch the active editor and clipboard; do not access files outside the vault.

## Performance

- Keep startup light — `onload` only registers commands, no heavy init.
- Avoid long-running tasks or excessive vault scans.

## Coding conventions

- TypeScript with `"strict": true` (tsconfig also enables `noUncheckedIndexedAccess`, `noImplicitReturns`, `noFallthroughCasesInSwitch`).
- Keep `main.ts` focused on command registration and editor logic; extract a helper function (as already done for `getLineRange`/`getLineRemovalRange`) when logic is reused across commands.
- Bundle everything into `main.js` (no unbundled runtime deps).
- Prefer `async/await` over promise chains; handle clipboard/editor errors gracefully (see `copyToClipboard`'s try/catch + `Notice` fallback).

## Mobile

- This plugin is not desktop-only (`isDesktopOnly: false`); it's specifically designed to help with imprecise line selection on mobile. Test changes on both platforms when touching selection/clipboard logic.

## Agent do/don't

**Do**

- Add commands with stable IDs (don't rename once released).
- Write and update Vitest coverage in `src/main.test.ts` for any behavior change.
- Run `npm run build`, `npm run lint`, and `npm test` before considering a change complete.

**Don't**

- Introduce network calls, telemetry, or external services.
- Add settings/UI/dependencies unless the feature genuinely requires them — this plugin is intentionally minimal.

## Troubleshooting

- Plugin doesn't load after build: ensure `main.js` and `manifest.json` are at the top level of `<Vault>/.obsidian/plugins/line-commands/`.
- Build issues: if `main.js` is missing, run `npm run build` or `npm run dev`.
- Commands not appearing: verify `addCommand` runs inside `onload` and IDs are unique.

## References

- Obsidian sample plugin (tooling reference): https://github.com/obsidianmd/obsidian-sample-plugin
- API documentation: https://docs.obsidian.md
- Developer policies: https://docs.obsidian.md/Developer+policies
- Plugin guidelines: https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines
- Style guide: https://help.obsidian.md/style-guide
