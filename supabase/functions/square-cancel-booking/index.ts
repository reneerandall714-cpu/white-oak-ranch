import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { admin, cors, ensureLink, json, reconcilePayment, rpc, square, squareConfig, staffFromRequest } from '../_shared/square.ts';

// Cancellation only releases inventory after Square has closed any balance link
// and every recorded charge has been fully refunded.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    squareConfig();
    const staff = await staffFromRequest(req);
    if (!staff || !['owner', 'admin'].includes(staff.role)) return json({ error: 'Owner or admin required' }, 403);
    const { requestId, reason } = await req.json();
    if (typeof requestId !== 'string' || !/^[a-f\d-]{36}$/i.test(requestId) ||
      typeof reason !== 'string' || !reason.trim() || reason.trim().length > 500) {
      return json({ error: 'Request and cancellation reason required' }, 400);
    }
    const payments = await admin.from('ranch_payments').select('*').eq('request_id', requestId);
    if (payments.error) throw payments.error;
    const initial = payments.data?.find((payment) => payment.phase === 'INITIAL');
    if (!initial || initial.status !== 'REFUNDED') {
      return json({ error: 'Refund the initial payment before cancellation' }, 409);
    }
    let balance = payments.data?.find((payment) => payment.phase === 'BALANCE');
    if (balance && ['CREATED', 'OPEN', 'FAILED', 'EXPIRED'].includes(balance.status)) {
      // A timed-out create request might have created a Square link without
      // attaching it locally. Square's payment ID is the idempotency key.
      if (!balance.square_link_id && balance.status !== 'EXPIRED') {
        await ensureLink({ payment_id: balance.id, amount_cents: balance.amount_cents,
          email: null, label: 'Reservation balance cancellation recovery',
          checkout_url: null, square_order_id: null });
        const refreshed = await admin.from('ranch_payments').select('*').eq('id', balance.id).single();
        if (refreshed.error) throw refreshed.error;
        balance = refreshed.data;
      }
      if (!balance.square_link_id || !balance.square_order_id) {
        return json({ error: 'Balance link requires reconciliation' }, 409);
      }
      if (balance.status !== 'EXPIRED') {
        try {
          await square('/online-checkout/payment-links/' + encodeURIComponent(balance.square_link_id),
            { method: 'DELETE' });
        } catch (error) {
          const current = (await square('/orders/' + encodeURIComponent(balance.square_order_id))).order;
          if (current?.state !== 'CANCELED') throw error;
        }
      }
      await reconcilePayment(balance.square_order_id, 'cancel:' + requestId + ':' + Date.now(),
        'cancellation_reconciliation');
      const order = (await square('/orders/' + encodeURIComponent(balance.square_order_id))).order;
      if (order?.state !== 'CANCELED') return json({ error: 'Balance order requires review' }, 409);
      const latest = await admin.from('ranch_payments').select('status').eq('id', balance.id).single();
      if (latest.error) throw latest.error;
      if (!['CREATED', 'OPEN', 'FAILED', 'EXPIRED'].includes(latest.data.status)) {
        return json({ error: 'Balance payment requires refund or review' }, 409);
      }
      if (balance.status !== 'EXPIRED') {
        await rpc('ranch_mark_square_link_expired', { p_payment_id: balance.id });
        return json({ error: 'Balance link closed. Retry cancellation after five minutes of reconciliation.' }, 409);
      }
      if (!balance.closed_at || Date.now() - new Date(balance.closed_at).getTime() < 300000) {
        return json({ error: 'Wait five minutes after closing the balance link' }, 409);
      }
    }
    const bearer = req.headers.get('authorization') ?? '';
    const userClient = createClient(Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: bearer } }, auth: { persistSession: false } });
    const result = await userClient.rpc('ranch_cancel_paid_booking', {
      p_request_id: requestId, p_reason: reason.trim(),
    });
    if (result.error) return json({ error: 'Refund and reconcile every payment before cancellation' }, 409);
    return json({ cancelled: result.data === true });
  } catch (error) {
    console.error('Square cancellation failed', error);
    return json({ error: 'Cancellation is uncertain; reconcile before retrying' }, 500);
  }
});
