import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

test('cancellation recovers an unattached balance link using the original checkout details', async () => {
  const requestId = '11111111-1111-4111-8111-111111111111';
  const checkout = {
    payment_id: 'balance-payment', amount_cents: 15000,
    email: 'guest@example.invalid', label: 'Reservation balance RV 09',
    checkout_url: null, square_order_id: null,
  };
  const balance = { id: checkout.payment_id, amount_cents: checkout.amount_cents, phase: 'BALANCE', status: 'CREATED' };
  const calls = [];
  const table = {
    select: () => table,
    eq: (field) => field === 'request_id'
      ? { data: [{ phase: 'INITIAL', status: 'REFUNDED' }, balance] }
      : table,
    single: () => ({ data: balance }),
  };
  globalThis.squareCancellationTestDependencies = {
    admin: { from: () => table }, cors: {}, json: (value, status) => Response.json(value, { status }),
    staffFromRequest: async () => ({ role: 'owner' }), squareConfig: () => {},
    ensureLink: async (prepared) => {
      calls.push(['checkout', prepared]);
      Object.assign(balance, { square_link_id: 'link', square_order_id: 'order', status: 'OPEN' });
    },
    rpc: async (name, args) => {
      calls.push([name, args]);
      if (name === 'ranch_prepare_balance_payment') return [checkout];
    },
    square: async (path, options) => {
      calls.push([path, options?.method]);
      return { order: { state: 'CANCELED' } };
    },
    reconcilePayment: async (orderId) => calls.push(['reconcile', orderId]),
  };
  let handler;
  globalThis.Deno = { serve: (callback) => { handler = callback; } };
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === '../_shared/square.ts') {
        const names = Object.keys(globalThis.squareCancellationTestDependencies).join(', ');
        return { url: 'data:text/javascript,' + encodeURIComponent(
          `export const { ${names} } = globalThis.squareCancellationTestDependencies;`,
        ), shortCircuit: true };
      }
      if (specifier.startsWith('npm:@supabase/supabase-js@')) {
        return { url: 'data:text/javascript,export%20const%20createClient%20%3D%20null', shortCircuit: true };
      }
      return nextResolve(specifier, context);
    },
  });
  try {
    await import('../supabase/functions/square-cancel-booking/index.ts');
    const response = await handler(new Request('http://localhost/cancel', {
      method: 'POST', body: JSON.stringify({ requestId, reason: 'Synthetic cancellation' }),
    }));
    assert.equal(response.status, 409);
    assert.deepEqual(calls, [
      ['ranch_prepare_balance_payment', { p_request_id: requestId }],
      ['checkout', checkout],
      ['/online-checkout/payment-links/link', 'DELETE'],
      ['reconcile', 'order'],
      ['/orders/order', undefined],
      ['ranch_mark_square_link_expired', { p_payment_id: balance.id }],
    ]);
  } finally {
    hooks.deregister();
    delete globalThis.Deno;
    delete globalThis.squareCancellationTestDependencies;
  }
});
