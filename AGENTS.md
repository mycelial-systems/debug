<!-- nightralph:start -->
## Agent skills

### Issue tracker

Issues are tracked as local markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout. See `docs/agents/domain.md`.
<!-- nightralph:end -->

## Testing

- `npm run test:package` (part of `npm test`) packs the package, installs
  the tarball into a temp dir outside the repo and bundles every export
  map entry with esbuild. Use it to catch imports of undeclared packages:
  the repo's own `node_modules` hoists packages like `ms` (via ESLint), so
  tests that import `src/` cannot see that class of bug.
- Entry points must import the vendored `src/ms.ts` (`../ms.js`), never
  the external `ms` package, which is not a dependency.
- The `index.min.*` builds use `--bundle`, so they inline whatever the
  build machine resolves; the unbundled builds keep bare imports.
