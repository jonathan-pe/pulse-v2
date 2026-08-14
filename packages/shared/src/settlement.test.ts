import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scorePick } from './settlement.js'
import { calculateWinPoints, calculateLossPoints } from './points.js'

const future = new Date('2030-01-01T00:00:00Z')
const past = new Date('2020-01-01T00:00:00Z')
const now = new Date('2025-01-01T00:00:00Z')

test('scheduled market, event has not started yet -> upcoming', () => {
  const result = scorePick({
    outcomeIndex: 0,
    priceAtPick: 0.5,
    marketStatus: 'scheduled',
    resolvedOutcomeIndex: null,
    eventStartTime: future,
    now,
  })
  assert.deepEqual(result, { status: 'upcoming', points: null })
})

test('scheduled market, event start time has passed -> pending (cron has not flipped status yet)', () => {
  const result = scorePick({
    outcomeIndex: 0,
    priceAtPick: 0.5,
    marketStatus: 'scheduled',
    resolvedOutcomeIndex: null,
    eventStartTime: past,
    now,
  })
  assert.deepEqual(result, { status: 'pending', points: null })
})

test('closed but not resolved -> pending', () => {
  const result = scorePick({
    outcomeIndex: 0,
    priceAtPick: 0.5,
    marketStatus: 'closed',
    resolvedOutcomeIndex: null,
    eventStartTime: past,
    now,
  })
  assert.deepEqual(result, { status: 'pending', points: null })
})

test('resolved, picked outcome matches -> won, with win points', () => {
  const result = scorePick({
    outcomeIndex: 1,
    priceAtPick: 0.4,
    marketStatus: 'resolved',
    resolvedOutcomeIndex: 1,
    eventStartTime: past,
    now,
  })
  assert.equal(result.status, 'won')
  assert.equal(result.points, calculateWinPoints(0.4))
})

test('resolved, picked outcome does not match -> lost, with loss points', () => {
  const result = scorePick({
    outcomeIndex: 0,
    priceAtPick: 0.4,
    marketStatus: 'resolved',
    resolvedOutcomeIndex: 1,
    eventStartTime: past,
    now,
  })
  assert.equal(result.status, 'lost')
  assert.equal(result.points, calculateLossPoints(0.4))
})

test('now exactly equal to eventStartTime is not upcoming', () => {
  const result = scorePick({
    outcomeIndex: 0,
    priceAtPick: 0.5,
    marketStatus: 'scheduled',
    resolvedOutcomeIndex: null,
    eventStartTime: now,
    now,
  })
  assert.equal(result.status, 'pending')
})
