# 02: Release 0.9.68 as a patch

**What to build:** dependents of `@substrate-system/debug` pick up the
browser `ms` fix with a normal update. The fix ships as patch version
0.9.68 through the existing `npm version patch` flow, which lints,
updates the TOC and changelog, then (in `postversion`) pushes with tags
and publishes to npm.

This is a human ticket because `postversion` publishes as part of the
same command, and the spec says the agent stops before publishing. The
maintainer runs the release.

Once 0.9.68 is published, the pin repository only needs to bump its
`@substrate-system/debug` version. That change lives in pin, not here.

**Blocked by:** 01

**Touches:** `package.json` (`version`), `CHANGELOG.md`, `README.md`
(TOC), the git tag `v0.9.68`, the npm registry

**Status:** ready-for-human

- [ ] `npm version patch` on the fixed branch produces version 0.9.68
  with a changelog entry and a pushed `v0.9.68` tag
- [ ] `npm view @substrate-system/debug version` reports 0.9.68
- [ ] In a fresh directory with no `ms` installed, esbuild bundles
  `import D from '@substrate-system/debug'` for the browser platform
  from the published 0.9.68 without errors
