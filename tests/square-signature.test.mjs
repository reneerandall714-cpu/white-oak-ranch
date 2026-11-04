import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import { verifySquareSignature } from '../supabase/functions/_shared/square-signature.ts';

test('Square signature binds exact URL and raw notification body', async () => {
  const url = 'https://staging.example.invalid/functions/v1/square-webhook';
  const body = '{"event_id":"synthetic","type":"payment.updated"}';
  const secret = 'synthetic-test-secret';
  const signature = createHmac('sha256', secret).update(url + body).digest('base64');
  assert.equal(await verifySquareSignature(body, signature, secret, url), true);
  assert.equal(await verifySquareSignature(body + ' ', signature, secret, url), false);
  assert.equal(await verifySquareSignature(body, signature, secret, url + '/'), false);
  assert.equal(await verifySquareSignature(body, 'not-base64', secret, url), false);
  assert.equal(await verifySquareSignature(body, signature, '', url), false);
});
