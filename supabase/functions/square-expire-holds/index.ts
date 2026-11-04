import { admin, cors, json, reconcilePayment, rpc, square, squareConfig } from '../_shared/square.ts';

// Invoke every minute with a server-side SQUARE_EXPIRY_JOB_SECRET. A failed
// Square request keeps the reservation hold; it is never released on a guess.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST' ||
    !Deno.env.get('SQUARE_EXPIRY_JOB_SECRET') ||
    req.headers.get('x-job-secret') !== Deno.env.get('SQUARE_EXPIRY_JOB_SECRET')) {
    return json({ error: 'Unauthorized' }, 401);
  }
  try {
    squareConfig();
    const cutoff = new Date().toISOString();
    const { data, error } = await admin.from('ranch_booking_requests')
      .select('id,hold_expires_at').eq('status', 'AWAITING_PAYMENT')
      .lt('hold_expires_at', cutoff).limit(100);
    if (error) throw error;
    const results = [];
    for (const hold of data ?? []) {
      try {
        const { data: payment } = await admin.from('ranch_payments').select('*')
          .eq('request_id', hold.id).eq('phase', 'INITIAL').maybeSingle();
        if (payment && !payment.square_link_id) {
          await admin.from('ranch_payments').update({ requires_review: true }).eq('id', payment.id);
          results.push({ id: hold.id, result: 'link_creation_uncertain' });
          continue;
        }
        if (payment?.square_link_id && ['OPEN', 'FAILED'].includes(payment.status)) {
          // Delete first: Square cancels the underlying order and prevents
          // another checkout. Confirm the order state and tenders afterwards.
          try {
            await square('/online-checkout/payment-links/' + encodeURIComponent(payment.square_link_id),
              { method: 'DELETE' });
          } catch (error) {
            const current = (await square('/orders/' + encodeURIComponent(payment.square_order_id))).order;
            if (current?.state !== 'CANCELED') throw error;
          }
          await rpc('ranch_mark_square_link_expired', { p_payment_id: payment.id });
        }
        if (payment?.square_order_id) {
          await reconcilePayment(payment.square_order_id,
            'reconcile:' + hold.id + ':' + Date.now(), 'expiry_reconciliation');
          const { data: refreshed } = await admin.from('ranch_payments').select('status')
            .eq('id', payment.id).single();
          if (!refreshed || !['EXPIRED', 'FAILED'].includes(refreshed.status)) {
            results.push({ id: hold.id, result: 'payment_reconciled_or_review' });
            continue;
          }
          const order = (await square('/orders/' + encodeURIComponent(payment.square_order_id))).order;
          if (order?.state !== 'CANCELED') {
            results.push({ id: hold.id, result: 'order_not_cancelled' });
            continue;
          }
        }
        const expired = await rpc<boolean>('ranch_expire_unpaid_hold', { p_request_id: hold.id });
        results.push({ id: hold.id, result: expired ? 'expired' : 'waiting' });
      } catch (error) {
        console.error('Hold reconciliation failed', hold.id, error);
        results.push({ id: hold.id, result: 'retry_required' });
      }
    }
    const dayParts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date()).map((part) => [part.type, part.value]));
    const day = dayParts.year + '-' + dayParts.month + '-' + dayParts.day;
    const passes = await admin.from('ranch_day_pass_orders').select('id')
      .in('status', ['UNPAID', 'FAILED']).lt('visit_date', day).limit(100);
    if (passes.error) throw passes.error;
    const dayPassResults = [];
    for (const pass of passes.data ?? []) {
      try {
        const { data: payment } = await admin.from('ranch_payments').select('*')
          .eq('day_pass_id', pass.id).single();
        if (!payment?.square_link_id) {
          if (payment) await admin.from('ranch_payments').update({ requires_review: true }).eq('id', payment.id);
          dayPassResults.push({ id: pass.id, result: 'link_creation_uncertain' });
          continue;
        }
        if (['OPEN', 'FAILED'].includes(payment.status)) {
          try {
            await square('/online-checkout/payment-links/' + encodeURIComponent(payment.square_link_id),
              { method: 'DELETE' });
          } catch (error) {
            const current = (await square('/orders/' + encodeURIComponent(payment.square_order_id))).order;
            if (current?.state !== 'CANCELED') throw error;
          }
          await rpc('ranch_mark_square_link_expired', { p_payment_id: payment.id });
        }
        await reconcilePayment(payment.square_order_id,
          'reconcile-day:' + pass.id + ':' + Date.now(), 'day_pass_reconciliation');
        const { data: refreshed } = await admin.from('ranch_payments').select('status')
          .eq('id', payment.id).single();
        const order = (await square('/orders/' + encodeURIComponent(payment.square_order_id))).order;
        if (!refreshed || !['EXPIRED', 'FAILED'].includes(refreshed.status) || order?.state !== 'CANCELED') {
          dayPassResults.push({ id: pass.id, result: 'payment_reconciled_or_review' });
          continue;
        }
        const expired = await rpc<boolean>('ranch_expire_day_pass', { p_day_pass_id: pass.id });
        dayPassResults.push({ id: pass.id, result: expired ? 'cancelled' : 'waiting' });
      } catch (error) {
        console.error('Day pass reconciliation failed', pass.id, error);
        dayPassResults.push({ id: pass.id, result: 'retry_required' });
      }
    }
    return json({ checked: results.length, results, dayPassResults });
  } catch (error) {
    console.error('Expiry job failed', error);
    return json({ error: 'Retry job' }, 500);
  }
});
