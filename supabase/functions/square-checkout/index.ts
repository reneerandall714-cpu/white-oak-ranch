import { admin, cors, ensureLink, json, rpc, squareConfig, type Prepared } from '../_shared/square.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    squareConfig();
    const input = req.method === 'POST' ? await req.json() : Object.fromEntries(new URL(req.url).searchParams);
    const action = String(input.action ?? 'quote');
    if (action === 'day_pass_quote') {
      const { data: cfg } = await admin.from('ranch_payment_settings').select('*').eq('id', true).single();
      if (!cfg?.day_pass_enabled) return json({ enabled: false });
      return json({ enabled: true, primaryCents: cfg.day_pass_primary_cents,
        additionalCents: cfg.day_pass_additional_cents, atvCents: cfg.atv_day_cents });
    }
    if (action === 'quote') {
      const token = String(input.token ?? '');
      if (!/^[a-f\d-]{36}$/i.test(token)) return json({ error: 'Invalid checkout link' }, 400);
      const { data: request } = await admin.from('ranch_booking_requests')
        .select('id,unit,arrival,departure,quoted_total,status,hold_expires_at,payment_choice,initial_due_cents,balance_due_cents,balance_due_on')
        .eq('checkout_token', token).maybeSingle();
      if (!request) return json({ error: 'Checkout link unavailable' }, 404);
      const { data: cfg } = await admin.from('ranch_payment_settings').select('*').eq('id', true).single();
      const total = Math.round(Number(request.quoted_total) * 100);
      const due = new Date(request.arrival + 'T12:00:00Z');
      due.setUTCDate(due.getUTCDate() - Number(cfg.balance_due_days_before_arrival));
      const deposit = cfg.deposit_type === 'FIXED'
        ? Math.round(Number(cfg.deposit_value) * 100)
        : Math.ceil(total * Number(cfg.deposit_value) / 100);
      const chicagoParts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit',
      }).formatToParts(new Date()).map((part) => [part.type, part.value]));
      const chicagoToday = chicagoParts.year + '-' + chicagoParts.month + '-' + chicagoParts.day;
      const depositAvailable = cfg.deposit_type !== 'FULL' && deposit > 0 && deposit < total &&
        due.toISOString().slice(0, 10) > chicagoToday;
      return json({
        unit: request.unit, arrival: request.arrival, departure: request.departure,
        totalCents: total, status: request.status, expiresAt: request.hold_expires_at,
        choice: request.payment_choice, initialDueCents: request.initial_due_cents,
        balanceCents: request.balance_due_cents, balanceDueOn: request.balance_due_on,
        depositAvailable, depositCents: depositAvailable ? deposit : null,
        proposedBalanceDueOn: depositAvailable ? due.toISOString().slice(0, 10) : null,
      });
    }
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    let prepared: Prepared;
    if (action === 'initial') {
      const rows = await rpc<Prepared[]>('ranch_prepare_initial_payment', {
        p_token: input.token, p_choice: input.choice,
      });
      prepared = rows[0];
    } else if (action === 'balance') {
      const { data: request } = await admin.from('ranch_booking_requests')
        .select('id,status').eq('checkout_token', input.token).maybeSingle();
      if (!request || request.status !== 'APPROVED') return json({ error: 'Balance unavailable' }, 409);
      const rows = await rpc<Prepared[]>('ranch_prepare_balance_payment', { p_request_id: request.id });
      prepared = rows[0];
    } else if (action === 'day_pass') {
      const rows = await rpc<Prepared[]>('ranch_prepare_day_pass', {
        p_key: input.key, p_name: input.name, p_email: input.email,
        p_visit_date: input.visitDate, p_additional: input.additional, p_atv: input.atv,
      });
      prepared = rows[0];
    } else return json({ error: 'Unknown action' }, 400);
    const url = await ensureLink(prepared);
    return json({ url, amountCents: prepared.amount_cents, totalCents: prepared.total_cents,
      balanceCents: prepared.balance_cents, balanceDueOn: prepared.balance_due_on });
  } catch (error) {
    console.error('Square checkout error', error);
    return json({ error: 'Checkout is unavailable. Contact the ranch.' }, 409);
  }
});
