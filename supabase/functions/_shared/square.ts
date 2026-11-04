import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { verifySquareSignature as verifyRawSquareSignature } from './square-signature.ts';

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-job-secret',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
export const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: cors });

const projectUrl = Deno.env.get('SUPABASE_URL') ?? '';
if (projectUrl.includes('wagmelaupruptnzwjjta')) {
  throw new Error('Production Supabase is forbidden for Square Sandbox functions');
}
export const admin = createClient(
  projectUrl,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } },
);
export function squareConfig() {
  if (Deno.env.get('SQUARE_ENV') !== 'sandbox') throw new Error('Square Sandbox is not enabled');
  const token = Deno.env.get('SQUARE_SANDBOX_TOKEN');
  const location = Deno.env.get('SQUARE_SANDBOX_LOCATION_ID');
  if (!token || !location) throw new Error('Square Sandbox credentials are missing');
  return { token, location };
}
export async function square(path: string, init: RequestInit = {}) {
  const { token } = squareConfig();
  const response = await fetch('https://connect.squareupsandbox.com/v2' + path, {
    ...init,
    headers: {
      'Square-Version': '2026-09-16',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.errors?.length) {
    throw new Error(`Square API ${response.status}: ${JSON.stringify(body.errors ?? [])}`);
  }
  return body;
}
export async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await admin.rpc(name, args);
  if (error) throw error;
  return data as T;
}
export async function staffFromRequest(req: Request) {
  const auth = req.headers.get('authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return null;
  const { data, error } = await admin.auth.getUser(auth.slice(7));
  if (error || !data.user) return null;
  const staff = await admin.from('ranch_staff').select('role,active')
    .eq('user_id', data.user.id).eq('active', true).maybeSingle();
  return staff.data ? { id: data.user.id, role: staff.data.role } : null;
}
export type Prepared = {
  payment_id: string; amount_cents: number; email: string | null;
  label: string; checkout_url: string | null; square_order_id: string | null;
  total_cents?: number; balance_cents?: number; balance_due_on?: string | null;
};
export async function ensureLink(prepared: Prepared) {
  if (prepared.checkout_url) return prepared.checkout_url;
  const { location } = squareConfig();
  const body = await square('/online-checkout/payment-links', {
    method: 'POST',
    body: JSON.stringify({
      idempotency_key: prepared.payment_id,
      quick_pay: {
        name: prepared.label,
        price_money: { amount: prepared.amount_cents, currency: 'USD' },
        location_id: location,
      },
      checkout_options: { allow_tipping: false },
      payment_note: `White Oak Ranch payment ${prepared.payment_id}`,
      // Square Sandbox rejects reserved example.com addresses used by synthetic guests.
      // Keep the address on the local booking, but let the test checkout collect it.
      ...(prepared.email && !/@example\.com$/i.test(prepared.email)
        ? { pre_populated_data: { buyer_email: prepared.email } } : {}),
    }),
  });
  const link = body.payment_link;
  if (!link?.id || !link?.order_id || !link?.url) throw new Error('Square returned an incomplete link');
  await rpc('ranch_attach_square_link', {
    p_payment_id: prepared.payment_id,
    p_link_id: link.id,
    p_order_id: link.order_id,
    p_url: link.url,
  });
  return link.url as string;
}
export async function verifySquareSignature(body: string, signature: string) {
  const secret = Deno.env.get('SQUARE_WEBHOOK_SIGNATURE_KEY') ?? '';
  const url = Deno.env.get('SQUARE_WEBHOOK_URL') ?? '';
  return verifyRawSquareSignature(body, signature, secret, url);
}
export async function reconcilePayment(orderId: string, eventId: string, eventType: string) {
  const order = (await square('/orders/' + encodeURIComponent(orderId))).order;
  const tenders = order?.tenders ?? [];
  for (const tender of tenders) {
    if (!tender.payment_id) continue;
    await recordVerifiedPayment(tender.payment_id, eventId + ':' + tender.payment_id, eventType);
  }
  return tenders.length;
}
export async function recordVerifiedPayment(paymentId: string, eventId: string, eventType: string) {
  const payment = (await square('/payments/' + encodeURIComponent(paymentId))).payment;
  const { location } = squareConfig();
  if (!payment || payment.location_id !== location || !payment.order_id ||
    payment.total_money?.currency !== 'USD') throw new Error('Square payment identity mismatch');
  return rpc<string>('ranch_record_square_payment', {
    p_event_id: eventId,
    p_event_type: eventType,
    p_order_id: payment.order_id,
    p_square_payment_id: payment.id,
    p_amount_cents: payment.total_money.amount,
    p_status: payment.status,
    p_receipt_url: payment.receipt_url ?? null,
    p_receipt_number: payment.receipt_number ?? null,
  });
}
