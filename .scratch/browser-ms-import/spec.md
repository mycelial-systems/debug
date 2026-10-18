# Browser build imports an undeclared `ms`

**Status:** ready-for-agent

## Problem Statement

An app that imports `@substrate-system/debug` in the browser can fail
to load with an unresolved import of `ms`. vite reports
`Failed to resolve import "ms" from
"node_modules/.vite/deps/@substrate-system_debug.js"`, and bundling
the package for the browser with esbuild fails with
`Could not resolve "ms"`.

The browser entry is the only entry point that imports the external
`ms` package by bare name. The node and cloudflare entries import the
package's own vendored copy of `ms`. `ms` is not a declared
dependency, so npm never installs it for this package.

It looks like it works because most apps have `ms` installed by
accident: ESLint (through `eslint` or `@typescript-eslint/parser`)
depends on `debug@4`, which depends on `ms@2`, and npm hoists it to
the top-level `node_modules`, where the bare import finds it. An app
with no ESLint, or with a package manager that does not hoist (pnpm,
for example), fails. The first known case is the pin repository's
example app, whose `npm ls ms` is empty.

This package's own repository depends on ESLint too, so its own tests
and CI also find a hoisted `ms` and never see the failure. The tests
also import `src/` directly, never the published package. The bug
dates from the commit that moved the browser source into its own
directory ("works with local vite"), and both 0.9.64 and 0.9.67 ship
it.

## Solution

The browser entry imports the package's own `ms` module, as the node
and cloudflare entries already do. Every entry point in the published
package resolves using only the package's declared dependencies, so
the package works in an app whatever else that app has installed. A
new test checks this against the packed tarball, so the class of bug
is caught before release.

## User Stories

1. As an app developer with no ESLint in my dependency tree, I want
   to import `@substrate-system/debug` in a browser page served by
   vite, so that my page loads instead of showing an unresolved
   import error.
2. As an app developer using a non-hoisting package manager, I want
   every entry point of the package to resolve, so that I do not
   have to install `ms` myself.
3. As an app developer bundling for the browser with esbuild or any
   other bundler, I want the `browser` export condition to bundle
   without errors, so that the package works outside vite too.
4. As the maintainer, I want a test that installs the packed tarball
   in isolation, so that an undeclared import in any entry point
   fails the test suite instead of failing for users.
5. As the maintainer, I want the fix released as a patch version, so
   that dependents pick it up with a normal update.

## Implementation Decisions

- The browser entry imports the vendored `ms` module through a
  relative import, the same way the cloudflare entry does, under
  the same `humanize` binding. No behavior change is intended: the
  vendored module is the `ms` formatter the other entries already
  use.
- `ms` is not added as a dependency. The package already ships its
  own copy, and adding the external package would only paper over
  the inconsistency.
- No change to the `exports` map, the build scripts or the
  published file list. The vendored `ms` module is already built to
  every format and shipped.
- After the fix, the built browser output (ESM, CJS and their
  minified forms) has no bare import other than declared
  dependencies.
- Release as a patch version (0.9.68) through the existing
  `npm version patch` flow (lint, changelog, push, publish). The
  agent stops before publishing; the maintainer runs the release.

## Testing Decisions

- A good test here exercises the package the way a consumer gets
  it: the packed tarball, installed with only its declared
  dependencies, and loaded through its public export map. It does
  not inspect source text or the build scripts.
- New seam: a packed-package test, run as its own npm script and
  added to `npm test` so CI runs it. It builds, runs `npm pack`,
  installs the tarball into a fresh temporary directory outside any
  repository (so Node's module resolution cannot walk up into a
  `node_modules` holding a hoisted `ms`), and then, for each public
  entry point, bundles a one-line consumer that imports it and calls
  the factory:
  - `.` under the `browser` condition (browser platform), the `node`
    condition (node platform), the `worker` condition, and the
    default condition;
  - the `./browser`, `./node`, `./cloudflare`, `./noop` and
    `./index` subpaths;
  - the `./min/*` subpaths for browser, node and cloudflare.
  Each bundle must succeed. The node bundle is also run, to show the
  entry loads and logs.
- The test must fail before the fix (the browser entries cannot
  resolve `ms`) and pass after it. Write it first and confirm it
  fails for that reason.
- Prior art: the `test:cloudflare` script already builds a consumer
  with esbuild before running it, and the browser and node tests
  bundle with esbuild. The new test follows that esbuild-based
  pattern but bundles from the installed tarball instead of `src/`.
- The existing browser, node and cloudflare tests stay as they are.

## Out of Scope

- Replacing or updating the vendored `ms` implementation.
- Removing ESLint or otherwise changing the repo's dev dependencies
  to stop `ms` being hoisted locally. The isolated install makes the
  test independent of that.
- Changing the `exports` map, its condition order, or the build
  layout.
- Changes in the pin repository. Once 0.9.68 is published, pin only
  needs to bump its `@substrate-system/debug` version.

## Further Notes

- To reproduce outside any app: in a directory with no `ms`
  installed, bundle `import D from '@substrate-system/debug'` with
  esbuild for the browser platform. It fails with
  `Could not resolve "ms"`.
- The CI workflow runs `npm install`, build, lint and `npm test` on
  Node 22, so adding the new script to `npm test` puts it in CI with
  no workflow change.
