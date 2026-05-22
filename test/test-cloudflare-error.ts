import { test } from '@substrate-system/tapzero'
import createDebugCF, {
    ERROR_COLOR
} from '../src/cloudflare/index.js'

test('Cloudflare ERROR_COLOR is ANSI 196', t => {
    t.equal(ERROR_COLOR, 196, 'ERROR_COLOR should be 196')
})

test('Cloudflare debug.error is a function', t => {
    const debug = createDebugCF('worker:test')
    t.ok(typeof debug.error === 'function',
        'debug.error should be a function')
})

test('Cloudflare debug.error does not throw when enabled', t => {
    const debug = createDebugCF('worker:enabled', { DEBUG: '*' })
    try {
        debug.error('error message in workers')
        t.ok(true, 'debug.error should not throw')
    } catch (err) {
        t.fail(`debug.error should not throw: ${err}`)
    }
})

test('Cloudflare debug.error does not throw when disabled', t => {
    const debug = createDebugCF('worker:disabled', { DEBUG: 'other' })
    try {
        debug.error('error message in workers')
        t.ok(true, 'debug.error should not throw when disabled')
    } catch (err) {
        t.fail(`debug.error should not throw: ${err}`)
    }
})
