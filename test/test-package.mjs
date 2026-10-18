/**
 * Packed-package test.
 *
 * Builds and packs the package, installs the tarball into a fresh temp
 * directory outside any repository, then bundles a one-line consumer for
 * every public entry point. Each entry point must resolve using only the
 * package's declared dependencies.
 */
import assert from 'node:assert'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test, { after, before, describe } from 'node:test'
import * as esbuild from 'esbuild'

const PKG = '@substrate-system/debug'
const NS = 'package-test'

const factoryCall = `createDebug('${NS}')('hello')`
const factoryConsumer = spec => {
    return `import createDebug from '${spec}'\n${factoryCall}\n`
}
const factoryRequirer = spec => {
    return `const { createDebug } = require('${spec}')\n${factoryCall}\n`
}

/**
 * name, import specifier, esbuild platform, extra conditions,
 * and whether to run the bundle with node.
 */
const ENTRIES = [
    ['. (browser)', PKG, 'browser', []],
    ['. (node)', PKG, 'node', [], true],
    ['. (worker)', PKG, 'neutral', ['worker']],
    ['. (default)', PKG, 'neutral', []],
    ['./browser', `${PKG}/browser`, 'browser', []],
    ['./node', `${PKG}/node`, 'node', [], true],
    ['./cloudflare', `${PKG}/cloudflare`, 'neutral', []],
    ['./noop', `${PKG}/noop`, 'neutral', []],
    ['./min/browser', `${PKG}/min/browser`, 'browser', []],
    ['./min/node', `${PKG}/min/node`, 'node', [], true],
    ['./min/cloudflare', `${PKG}/min/cloudflare`, 'neutral', []],
]

/**
 * Each entry is bundled twice: as ESM, which resolves the `import`
 * condition, and as CJS, which resolves the `require` condition.
 */
const CASES = ENTRIES.flatMap(([name, spec, platform, conditions, run]) => [
    {
        name: `${name} (import)`,
        format: 'esm',
        platform,
        conditions,
        run: !!run,
        contents: factoryConsumer(spec)
    },
    {
        name: `${name} (require)`,
        format: 'cjs',
        platform,
        conditions,
        run: !!run,
        contents: factoryRequirer(spec)
    }
])

// `./index` has no default factory; call one of its exported functions
CASES.push({
    name: './index (import)',
    format: 'esm',
    platform: 'neutral',
    conditions: [],
    run: false,
    contents: `import { generateRandomString } from '${PKG}/index'\n` +
        'generateRandomString()\n'
}, {
    name: './index (require)',
    format: 'cjs',
    platform: 'neutral',
    conditions: [],
    run: false,
    contents: `const { generateRandomString } = require('${PKG}/index')\n` +
        'generateRandomString()\n'
})

/**
 * Run a script with node and check that the debug factory logged.
 */
function assertLogs (file, cwd) {
    const result = spawnSync('node', [file], {
        cwd,
        encoding: 'utf8',
        env: { ...process.env, DEBUG: NS }
    })
    assert.strictEqual(result.status, 0, result.stderr)
    assert.ok(
        result.stderr.includes(NS),
        'the debug factory should log the namespace'
    )
}

describe('packed package', () => {
    let dir

    before(() => {
        dir = mkdtempSync(join(tmpdir(), 'debug-package-test-'))
        execFileSync('npm', ['run', 'build'], {
            stdio: ['ignore', 'ignore', 'inherit']
        })
        const tarball = execFileSync('npm', [
            'pack',
            '--silent',
            '--pack-destination',
            dir
        ], { encoding: 'utf8' }).trim().split('\n').pop()

        writeFileSync(join(dir, 'package.json'), JSON.stringify({
            name: 'consumer',
            private: true,
            type: 'module'
        }))

        execFileSync('npm', [
            'install',
            join(dir, tarball),
            '--prefer-offline',
            '--no-audit',
            '--no-fund',
            '--no-package-lock',
            '--ignore-scripts'
        ], { cwd: dir, stdio: 'inherit' })
    })

    after(() => {
        if (dir) rmSync(dir, { recursive: true, force: true })
    })

    test('the temp install has no `ms` package', () => {
        assert.ok(existsSync(join(dir, 'node_modules', PKG)))
        assert.strictEqual(existsSync(join(dir, 'node_modules', 'ms')), false)
    })

    for (const c of CASES) {
        test(`bundles ${c.name}`, async () => {
            const ext = c.format === 'cjs' ? 'cjs' : 'mjs'
            const outfile = join(dir, `out-${CASES.indexOf(c)}.${ext}`)
            await esbuild.build({
                stdin: {
                    contents: c.contents,
                    resolveDir: dir,
                    sourcefile: 'consumer.js'
                },
                absWorkingDir: dir,
                bundle: true,
                format: c.format,
                platform: c.platform,
                conditions: c.conditions,
                outfile,
                logLevel: 'silent'
            })

            if (!c.run) return
            assertLogs(outfile, dir)

            if (c.format !== 'cjs') return
            // also load the installed CJS files with node's own `require`,
            // without a bundler in between
            const consumer = join(dir, `consumer-${CASES.indexOf(c)}.cjs`)
            writeFileSync(consumer, c.contents)
            assertLogs(consumer, dir)
        })
    }
})
