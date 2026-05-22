import { test } from '@substrate-system/tapzero'
import createDebug, { ERROR_COLOR } from '../src/node/index.js'

test('Node ERROR_COLOR is ANSI 196', t => {
    t.equal(ERROR_COLOR, 196, 'ERROR_COLOR should be 196')
})

test('Node debug.error is a function', t => {
    const debug = createDebug('test')
    t.ok(typeof debug.error === 'function',
        'debug.error should be a function')
})

test('Node debug.error does not throw', t => {
    const debug = createDebug('test', { DEBUG: '*' })
    try {
        debug.error('an error message')
        t.ok(true, 'debug.error should not throw')
    } catch (err) {
        t.fail(`debug.error should not throw: ${err}`)
    }
})

test('Node debug.error does not throw when disabled', t => {
    const debug = createDebug('test', { DEBUG: 'other' })
    try {
        debug.error('an error message')
        t.ok(true, 'debug.error should not throw when disabled')
    } catch (err) {
        t.fail(`debug.error should not throw: ${err}`)
    }
})
