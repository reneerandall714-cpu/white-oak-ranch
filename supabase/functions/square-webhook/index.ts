import { admin, cors, json, recordVerifiedPayment, rpc, square, squareConfig, verifySquareSignature } from '../_shared/square.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    squareConfig();
    const raw = await req.text();
    const valid = await verifySquareSignature(raw, req.headers.get('x-square-hmacsha256-signature') ?? '');
    if (!valid) return json({ error: 'Invalid signature' }, 403);
    const event = JSON.parse(raw);
    if (typeof event.event_id !== 'string' || typeof event.type !== 'string') return json({ error: 'Invalid event' }, 400);
    if (event.type === 'payment.created' || event.type === 'payment.updated') {
      const id = event.data?.object?.payment?.id;
      if (!id) return json({ error: 'Missing payment' }, 400);
      const result = await recordVerifiedPayment(id, event.event_id, event.type);
      return json({ received: true, result });
    }
    if (event.type === 'refund.created' || event.type === 'refund.updated') {
      const id = event.data?.object?.refund?.id;
      if (!id) return json({ error: 'Missing refund' }, 400);
      const refund = (await square('/refunds/' + encodeURIComponent(id))).refund;
      const { location } = squareConfig();
      if (!refund || refund.location_id !== location ||
        refund.amount_money?.currency !== 'USD' || !refund.payment_id) {
        throw new Error('Square refund identity mismatch');
      }
      const squarePayment = (await square('/payments/' + encodeURIComponent(refund.payment_id))).payment;
      if (!squarePayment || squarePayment.location_id !== location || !squarePayment.order_id) {
        throw new Error('Refund payment identity mismatch');
      }
      const linked = await admin.from('ranch_payments').select('id,square_payment_id')
        .eq('square_order_id', squarePayment.order_id).maybeSingle();
      if (!linked.data) return json({ received: true, ignored: true });
      if (!linked.data.square_payment_id) throw new Error('Payment event must be reconciled first');
      const result = await rpc<string>('ranch_record_square_refund', {
        p_event_id: event.event_id, p_type: event.type,
        p_refund_id: refund.id, p_square_payment_id: refund.payment_id,
        p_amount_cents: refund.amount_money.amount, p_status: refund.status,
      });
      if (result === 'unknown_payment') throw new Error('Payment event must be reconciled first');
      return json({ received: true, result });
    }
    if (event.type === 'dispute.created' || event.type === 'dispute.state.updated') {
      const dispute = event.data?.object?.dispute;
      const paymentId = dispute?.disputed_payment?.payment_id;
      if (!paymentId) return json({ error: 'Missing disputed payment' }, 400);
      const { location } = squareConfig();
      if (dispute.location_id !== location) return json({ error: 'Unexpected Square location' }, 400);
      const result = await rpc<string>('ranch_flag_square_dispute', {
        p_event_id: event.event_id, p_type: event.type, p_square_payment_id: paymentId,
      });
      return json({ received: true, result });
    }
    return json({ received: true, ignored: true });
  } catch (error) {
    console.error('Square webhook processing failed', error);
    return json({ error: 'Retry event' }, 500);
  }
});
