import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SCHEMAS_PACKAGE_READY } from './index.js'

test('package builds and exports resolve', () => {
  assert.equal(SCHEMAS_PACKAGE_READY, true)
})
