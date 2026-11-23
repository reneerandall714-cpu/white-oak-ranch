import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

test('expiration releases only holds with known payment state and reconciled orders', async () => {
  const holds = ['lookup-failed', 'unpaid', 'unlinked', 'missing-order', 'open', 'paid-during-close', 'order-still-open'];
  const payments = {
    unlinked: { status: 'CREATED' },
    'missing-order': { status: 'OPEN', square_link_id: 'link' },
    open: { status: 'OPEN', square_link_id: 'link-open', square_order_id: 'order-open' },
    'paid-during-close': { status: 'OPEN', square_link_id: 'link-paid', square_order_id: 'order-paid' },
    'order-still-open': { status: 'EXPIRED', square_link_id: 'link-active', square_order_id: 'order-active' },
  };
  const calls = [];
  const dependencies = {
    admin: {
      from(table) {
        let id;
        const query = {
          select: () => query,
          update: (fields) => ({ eq: (key, value) => { calls.push(['review', value, fields]); return { error: null }; } }),
          eq: (key, value) => { if (key !== 'phase') id = value; return query; },
          lt: () => query,
          in: () => query,
          limit: () => ({ data: table === 'ranch_booking_requests' ? holds.map(id => ({ id })) : [] }),
          maybeSingle: () => id === 'lookup-failed'
            ? { data: null, error: new Error('Synthetic database read failure') }
            : { data: payments[id] ? { id, ...payments[id] } : null },
          single: () => ({ data: { status: id === 'paid-during-close' ? 'PAID' : 'EXPIRED' } }),
        };
        return query;
      },
    },
    cors: {},
    json: (value, status) => Response.json(value, { status }),
    squareConfig: () => {},
    square: async (path, options) => {
      calls.push(['square', path, options?.method]);
      return { order: { state: path.endsWith('order-active') ? 'OPEN' : 'CANCELED' } };
    },
    reconcilePayment: async (order) => calls.push(['reconcile', order]),
    rpc: async (name, values) => {
      calls.push([name, values]);
      return true;
    },
  };

  let handler;
  globalThis.Deno = {
    env: { get: (name) => name === 'SQUARE_EXPIRY_JOB_SECRET' ? 'test-only' : undefined },
    serve: callback => { handler = callback; },
  };
  globalThis.squareExpirationDependencies = dependencies;
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier !== '../_shared/square.ts') return nextResolve(specifier, context);
      const names = Object.keys(dependencies).join(', ');
      return {
        url: 'data:text/javascript,' + encodeURIComponent(
          `export const { ${names} } = globalThis.squareExpirationDependencies;`,
        ),
        shortCircuit: true,
      };
    },
  });

  try {
    await import('../supabase/functions/square-expire-holds/index.ts');
    const unauthorized = await handler(new Request('http://localhost/expiry', { method: 'POST' }));
    assert.equal(unauthorized.status, 401);
    assert.deepEqual(calls, []);

    const response = await handler(new Request('http://localhost/expiry', {
      method: 'POST', headers: { 'x-job-secret': 'test-only' },
    }));
    assert.equal(response.status, 200);
    const { results } = await response.json();
    assert.deepEqual(results.map(({ result }) => result), [
      'retry_required', 'expired', 'link_creation_uncertain', 'retry_required',
      'expired', 'payment_reconciled_or_review', 'order_not_cancelled',
    ]);
    assert.deepEqual(calls.filter(([name]) => name === 'ranch_expire_unpaid_hold'), [
      ['ranch_expire_unpaid_hold', { p_request_id: 'unpaid' }],
      ['ranch_expire_unpaid_hold', { p_request_id: 'open' }],
    ]);
    assert.deepEqual(calls.filter(([name, path]) => name === 'square' && path.includes('link-open')), [
      ['square', '/online-checkout/payment-links/link-open', 'DELETE'],
    ]);
    assert.ok(calls.some(([name, order]) => name === 'reconcile' && order === 'order-paid'));
  } finally {
    hooks.deregister();
    delete globalThis.Deno;
    delete globalThis.squareExpirationDependencies;
  }
});
