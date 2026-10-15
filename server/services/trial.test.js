import assert from 'node:assert/strict'
import test from 'node:test'
import { guestAccess, needsReminder, ownerTrialState, priceFor, trialConfig, utcMs } from './trial.js'

const NOW = Date.parse('2026-10-18T08:00:00Z') // Sab 15:00 WIB
const mysql = (ms) => new Date(ms).toISOString().slice(0, 19).replace('T', ' ')
const H = 3600 * 1000
const env = { INVITATION_PRICE_IDR: '49999', TRIAL_OFFER_PRICE_IDR: '39999' }

test('trial is exactly 72 hours by default', () => {
  assert.equal(trialConfig({}).hours, 72)
  assert.equal(trialConfig({ TRIAL_DAYS: '2' }).hours, 48)
  assert.equal(trialConfig({ TRIAL_OFFER_PRICE_IDR: '39999' }).offerPrice, 39999)
  assert.equal(trialConfig({}).offerPrice, null)
})

test('utcMs reads MySQL DATETIME strings as UTC', () => {
  assert.equal(utcMs('2026-10-18 08:00:00'), NOW)
  assert.equal(utcMs(null), null)
})

test('trial invitation is open until the exact second it ends, then closed (owner can preview)', () => {
  const inv = { status: 'active', trial_ends_at: mysql(NOW + 1000), expires_at: mysql(NOW - 99 * H) }
  assert.deepEqual(guestAccess(inv, NOW), { ok: true, trial: true })
  const ended = guestAccess({ ...inv, trial_ends_at: mysql(NOW) }, NOW)
  assert.equal(ended.ok, false)
  assert.equal(ended.code, 'INVITATION_TRIAL_ENDED')
  assert.equal(ended.ownerPreview, true)
})

test('paid invitation stays open forever (ignores the reception-based expiry)', () => {
  assert.deepEqual(guestAccess({ status: 'active', paid_at: mysql(NOW - H), expires_at: mysql(NOW - 999 * H) }, NOW), { ok: true })
})

test('old free invitation still expires 7 days after the reception', () => {
  assert.equal(guestAccess({ status: 'active', expires_at: mysql(NOW + H) }, NOW).ok, true)
  assert.equal(guestAccess({ status: 'active', expires_at: mysql(NOW - H) }, NOW).code, 'INVITATION_EXPIRED')
})

test('suspended / draft rules unchanged', () => {
  assert.equal(guestAccess({ status: 'suspended', paid_at: mysql(NOW) }, NOW).code, 'INVITATION_SUSPENDED')
  const draft = guestAccess({ status: 'draft' }, NOW)
  assert.equal(draft.code, 'INVITATION_INACTIVE')
  assert.equal(draft.ownerPreview, true)
})

test('offer price applies only while valid and cheaper than normal', () => {
  const inv = { offer_price: 39999, offer_expires_at: mysql(NOW + H) }
  assert.equal(priceFor(inv, NOW, env).amount, 39999)
  assert.equal(priceFor({ ...inv, offer_expires_at: mysql(NOW - 1000) }, NOW, env).amount, 49999)
  assert.equal(priceFor({}, NOW, env).amount, 49999)
  assert.equal(priceFor({ offer_price: 60000, offer_expires_at: mysql(NOW + H) }, NOW, env).amount, 49999)
})

test('owner phases', () => {
  const base = { status: 'active' }
  assert.equal(ownerTrialState({ ...base, trial_ends_at: mysql(NOW + H) }, { free: false }, NOW, env).phase, 'trial')
  assert.equal(ownerTrialState({ ...base, trial_ends_at: mysql(NOW - H) }, { free: false }, NOW, env).phase, 'trial_ended')
  assert.equal(ownerTrialState({ ...base, paid_at: mysql(NOW) }, { free: false }, NOW, env).phase, 'paid')
  assert.equal(ownerTrialState(base, { free: true }, NOW, env).phase, 'free')
  const offer = ownerTrialState({ ...base, trial_ends_at: mysql(NOW + H), offer_price: 39999, offer_expires_at: mysql(NOW + 30 * H) }, { free: false }, NOW, env)
  assert.equal(offer.price, 39999)
  assert.equal(offer.normal_price, 49999)
})

test('reminder window: last 24h of the trial up to 24h after, once, unpaid only', () => {
  const inv = (end, extra = {}) => ({ trial_ends_at: mysql(end), ...extra })
  assert.equal(needsReminder(inv(NOW + 25 * H), NOW), false)
  assert.equal(needsReminder(inv(NOW + 23 * H), NOW), true)
  assert.equal(needsReminder(inv(NOW - 23 * H), NOW), true)
  assert.equal(needsReminder(inv(NOW - 25 * H), NOW), false)
  assert.equal(needsReminder(inv(NOW + H, { trial_reminder_sent_at: mysql(NOW) }), NOW), false)
  assert.equal(needsReminder(inv(NOW + H, { paid_at: mysql(NOW) }), NOW), false)
})
