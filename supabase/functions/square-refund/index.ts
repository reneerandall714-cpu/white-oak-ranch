import { admin, cors, json, rpc, square, squareConfig, staffFromRequest } from '../_shared/square.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    squareConfig();
    const staff = await staffFromRequest(req);
    if (!staff || !['owner', 'admin'].includes(staff.role)) return json({ error: 'Owner or admin required' }, 403);
    const input = await req.json();
    const { data: payment } = await admin.from('ranch_payments').select('*')
      .eq('id', input.paymentId).maybeSingle();
    if (!payment || !payment.square_payment_id || !['PAID', 'PARTIAL_REFUND'].includes(payment.status)) {
      return json({ error: 'Payment cannot be refunded' }, 409);
    }
    const amount = Number(input.amountCents);
    if (!Number.isSafeInteger(amount) || amount <= 0 ||
      amount > payment.amount_cents - payment.refunded_cents) return json({ error: 'Invalid refund amount' }, 400);
    const reason = String(input.reason ?? '').trim();
    if (!reason || reason.length > 192) return json({ error: 'Refund reason required' }, 400);
    const intentId = await rpc<string>('ranch_prepare_refund', {
      p_payment_id: payment.id, p_amount_cents: amount,
      p_reason: reason, p_staff_id: staff.id,
    });
    const result = await square('/refunds', {
      method: 'POST',
      body: JSON.stringify({
        idempotency_key: intentId,
        payment_id: payment.square_payment_id,
        amount_money: { amount, currency: 'USD' },
        reason,
      }),
    });
    const refund = result.refund;
    if (!refund || refund.payment_id !== payment.square_payment_id ||
      refund.amount_money?.amount !== amount) throw new Error('Unexpected Square refund result');
    await rpc('ranch_attach_refund', {
      p_intent_id: intentId, p_square_refund_id: refund.id, p_status: refund.status,
    });
    await rpc('ranch_record_square_refund', {
      p_event_id: 'requested:' + refund.id, p_type: 'staff_refund_requested',
      p_refund_id: refund.id, p_square_payment_id: refund.payment_id,
      p_amount_cents: amount, p_status: refund.status,
    });
    return json({ refundId: refund.id, status: refund.status });
  } catch (error) {
    console.error('Square refund error', error);
    return json({ error: 'Refund status uncertain; reconcile before retrying' }, 500);
  }
});
