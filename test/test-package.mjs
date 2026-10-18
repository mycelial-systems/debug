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

/**
 * name, import specifier, esbuild platform, extra conditions,
 * consumer source, and whether to run the bundle with node.
 */
const CASES = [
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
].map(([name, spec, platform, conditions, run]) => ({
    name,
    platform,
    conditions,
    run: !!run,
    contents: factoryConsumer(spec)
}))

// `./index` has no default factory; call one of its exported functions
CASES.push({
    name: './index',
    platform: 'neutral',
    conditions: [],
    run: false,
    contents: `import { generateRandomString } from '${PKG}/index'\n` +
        'generateRandomString()\n'
})

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
            const outfile = join(dir, `out-${CASES.indexOf(c)}.mjs`)
            await esbuild.build({
                stdin: {
                    contents: c.contents,
                    resolveDir: dir,
                    sourcefile: 'consumer.js'
                },
                absWorkingDir: dir,
                bundle: true,
                format: 'esm',
                platform: c.platform,
                conditions: c.conditions,
                outfile,
                logLevel: 'silent'
            })

            if (!c.run) return

            const result = spawnSync('node', [outfile], {
                cwd: dir,
                encoding: 'utf8',
                env: { ...process.env, DEBUG: NS }
            })
            assert.strictEqual(result.status, 0, result.stderr)
            assert.ok(
                result.stderr.includes(NS),
                'the debug factory should log the namespace'
            )
        })
    }
})
