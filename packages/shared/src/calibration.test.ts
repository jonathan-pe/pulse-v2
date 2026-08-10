import { test } from 'node:test'
import assert from 'node:assert/strict'
import { brierScore, meanBrierScore } from './calibration.js'

test('brierScore is 0 for a perfectly calibrated correct pick', () => {
  assert.equal(brierScore({ p: 1, isCorrect: true }), 0)
})

test('brierScore is 0 for a perfectly calibrated incorrect pick', () => {
  assert.equal(brierScore({ p: 0, isCorrect: false }), 0)
})

test('brierScore is 1 for the worst possible miss', () => {
  assert.equal(brierScore({ p: 0, isCorrect: true }), 1)
  assert.equal(brierScore({ p: 1, isCorrect: false }), 1)
})

test('meanBrierScore averages across predictions', () => {
  const score = meanBrierScore([
    { p: 1, isCorrect: true }, // 0
    { p: 0, isCorrect: true }, // 1
  ])
  assert.equal(score, 0.5)
})

test('meanBrierScore rejects an empty array', () => {
  assert.throws(() => meanBrierScore([]))
})
