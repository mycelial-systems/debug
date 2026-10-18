<!-- nightralph:entry ticket=browser-ms-import:1 attempt=1 outcome=done -->
## 2026-10-18 15:50 -- browser-ms-import/01 attempt 1 -- done

Effort: medium. Agent exit: 0. Subagents: 0. Cost: $0.69. Checked items: "`npm run test:package` installs the packed tarball into a temporary directory with no `ms` installed and bundles a consumer for each condition and subpath listed above", "Before the import fix, `npm run test:package` fails, and the failure names an unresolved `ms` from a browser entry", "After the import fix, every bundle in `npm run test:package` succeeds", "The bundled node consumer runs from the temporary install and logs through the debug factory without error", "`npm test` runs `test:package`, and `npm test` and `npm run lint` both pass", "The built browser output (ESM, CJS and their minified forms) contains no bare import other than declared dependencies".

### Agent notes
# Notes: 01-entry-points-resolve-from-packed-tarball

## Implemented
- test/test-package.mjs: node:test suite. Builds, `npm pack`s into a
  mkdtemp dir under os.tmpdir(), installs the tarball there with
  --prefer-offline --ignore-scripts --no-package-lock, asserts no
  node_modules/ms, then bundles a consumer per entry point with the esbuild
  JS API. Node-platform bundles (`.` node, ./node, ./min/node) are run with
  DEBUG=package-test and must exit 0 and log the namespace to stderr.
  Temp dir removed in after().
- package.json: `test:package` script, appended to `test`.
- src/browser/index.ts: `import humanize from '../ms.js'`.

## Red run (before fix)
Failed: `. (browser)`, `. (default)`, `./browser`, each with
`dist/browser/index.js:3:21: ERROR: Could not resolve "ms"`.
`./min/browser` passed even before the fix: the min builds use --bundle,
so they inline the hoisted `ms` from the repo's node_modules at build time.
The ticket expected it to fail; it did not, and it still passes after.

## Interpretation
- Conditions: browser -> platform browser; node -> platform node;
  worker -> platform neutral + conditions ['worker']; default -> platform
  neutral with no extra conditions.
- `./index` has no default factory, so its consumer calls
  `generateRandomString()`.
- "No bare import other than declared deps" checked by grepping
  dist/browser/*.js and *.cjs: only relative imports remain.

## Noticed, out of scope
- dist/browser/index.cjs requires "../ms.js" etc. (.js files are ESM since
  type: module). Pre-existing pattern shared by cloudflare cjs; not touched.
- `npm run lint` globs ts,js only, so test/*.mjs is not linted.

---
