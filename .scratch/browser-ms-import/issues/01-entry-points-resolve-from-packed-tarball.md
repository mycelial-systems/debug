# 01: Every entry point resolves from the packed tarball using only declared dependencies

**What to build:** an app that installs `@substrate-system/debug` with
no `ms` anywhere in its dependency tree can import every public entry
point of the package and bundle it for its platform. Today the browser
entry imports the external `ms` package by bare name, so the `browser`
and `default` conditions, the `./browser` subpath and `./min/browser`
fail with `Could not resolve "ms"`. After this ticket the browser entry
imports the package's own vendored `ms` module through a relative
import under the `humanize` binding, the same way the cloudflare entry
does, and a packed-package test guards the whole export map against
undeclared imports.

Work test-first. Write the packed-package test, run it, and confirm it
fails on the browser entries because `ms` cannot be resolved. Only then
change the import.

The test builds the package, runs `npm pack`, installs the tarball into
a fresh temporary directory outside any repository (so module
resolution cannot walk up into a `node_modules` with a hoisted `ms`),
and for each public entry point bundles with esbuild a one-line
consumer that imports it and calls the factory:

- `.` under the `browser` condition (browser platform), the `node`
  condition (node platform), the `worker` condition, and the default
  condition
- the `./browser`, `./node`, `./cloudflare`, `./noop` and `./index`
  subpaths
- the `./min/*` subpaths for browser, node and cloudflare

The node bundle is also executed. The temp directory is removed when
the test finishes, pass or fail.

`ms` is not added as a dependency. The `exports` map, the build
scripts, the published file list and the existing browser, node and
cloudflare tests stay as they are.

**Blocked by:** None (can start immediately)

**Touches:** `src/browser/index.ts` (the `humanize` import; import from
`../ms.js` like `src/cloudflare/index.ts`), a new packed-package test
script under `test/`, `package.json` (a new `test:package` script,
appended to `test`)

**Status:** ready-for-agent

- [ ] `npm run test:package` installs the packed tarball into a
  temporary directory with no `ms` installed and bundles a consumer for
  each condition and subpath listed above
- [ ] Before the import fix, `npm run test:package` fails, and the
  failure names an unresolved `ms` from a browser entry
- [ ] After the import fix, every bundle in `npm run test:package`
  succeeds
- [ ] The bundled node consumer runs from the temporary install and
  logs through the debug factory without error
- [ ] `npm test` runs `test:package`, and `npm test` and `npm run lint`
  both pass
- [ ] The built browser output (ESM, CJS and their minified forms)
  contains no bare import other than declared dependencies
