<!-- nightralph:review from=aa8c00d3bd5eb77815da93fa42747e97ba6f3979 to=04087bf9f6d568efb9353cb1b9837b1ab1059340 status=fixed -->
## 2026-10-18 15:54 -- review aa8c00d..04087bf -- 1 of 1 fixed
- [x] The packed-package test bundles only with `format: 'esm'`, so it resolves just the `import` condition and never checks the `require` (CJS) half of the export map
    test/test-package.mjs:103-115 -- every case resolves `./dist/**/index.js`. The `.cjs` files that `require` points to (for example `dist/browser/index.cjs`, `dist/node/index.cjs`) are never resolved or loaded. A bare `require('ms')`, or any other undeclared package that shows up only in the CJS output, would pass this test. The CJS builds also currently `require("../ms.js")`, which is the ESM file, not `../ms.cjs`, and the test cannot see that either. Add a CJS consumer (`format: 'cjs'` with a `require(...)` source, or `node -e "require(...)"` for the node entries) for each entry point.

### Fix
- attempts: 1 of 4
- effort: medium
- agent exit code: 0
- result: merged

# Notes: CJS coverage in packed-package test

## Finding: test bundles only with format esm
Done. test/test-package.mjs now runs every entry point twice: an ESM
consumer (`import`, esbuild format esm) and a CJS consumer
(`const { createDebug } = require(...)`, esbuild format cjs), so both
the `import` and `require` halves of the export map are resolved. For
the node entries (`.` node, `./node`, `./min/node`) the CJS bundle is run,
and an unbundled `.cjs` consumer is also run with node's own `require`
against the installed tarball. `./index` has a require variant too.

Red check: the test passed on first run because the current CJS output
has no undeclared imports. To confirm it catches the class of bug, I
temporarily appended `require("ms")` to dist/browser/index.cjs after
build (throwaway copies of the old and new test). The old test passed
13/13; the new one failed the 3 browser `require` cases. Copies deleted.

`require("../ms.js")` in the CJS builds: it loads the ESM file. On Node
22+ (`require(esm)`) this works, and the unbundled node `require` run
logs through `ms` fine, so the test now exercises that path. On a Node
without require(esm) it would fail. Changing the build to emit
`../ms.cjs` is a build change, which the spec puts out of scope, so I
did not change it.

Files changed: test/test-package.mjs, AGENTS.md.
---
