import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SQUARE_SANDBOX_CHECKOUT_ENABLED } from '../constants/feature-flags';
import { supabase } from '../lib/supabase';

type PaymentRow = {
  id: string; request_id: string | null; day_pass_id: string | null;
  phase: 'INITIAL' | 'BALANCE' | 'DAY_PASS'; amount_cents: number;
  status: string; square_payment_id: string | null; receipt_url: string | null;
  receipt_number: string | null; refunded_cents: number; requires_review: boolean;
  created_at: string; paid_at: string | null;
  ranch_booking_requests: {
    guest_name: string; unit: string; quoted_total: number;
    balance_due_cents: number | null; balance_due_on: string | null; status: string;
  } | null;
  ranch_day_pass_orders: { guest_name: string; visit_date: string; status: string } | null;
};
type Filter = 'ALL' | 'OPEN' | 'PAID' | 'FAILED' | 'REFUNDED' | 'REVIEW';
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function PaymentsScreen() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [role, setRole] = useState('');
  const [refundId, setRefundId] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  async function refresh() {
    if (!SQUARE_SANDBOX_CHECKOUT_ENABLED) return;
    setLoading(true); setMessage('');
    const [{ data, error }, user] = await Promise.all([
      supabase.from('ranch_payments').select(
        'id,request_id,day_pass_id,phase,amount_cents,status,square_payment_id,receipt_url,receipt_number,refunded_cents,requires_review,created_at,paid_at,ranch_booking_requests(guest_name,unit,quoted_total,balance_due_cents,balance_due_on,status),ranch_day_pass_orders(guest_name,visit_date,status)'
      ).order('created_at', { ascending: false }).limit(200),
      supabase.auth.getUser(),
    ]);
    if (error) setMessage('Could not load payment records. Sign in as active staff and retry.');
    else setRows((data ?? []) as unknown as PaymentRow[]);
    if (user.data.user) {
      const staff = await supabase.from('ranch_staff').select('role').eq('user_id', user.data.user.id).maybeSingle();
      setRole(staff.data?.role ?? '');
    }
    setLoading(false);
  }
  useEffect(() => { void refresh(); }, []);

  async function refund() {
    const row = rows.find((r) => r.id === refundId);
    const cents = Math.round(Number(refundAmount) * 100);
    if (!row || !Number.isSafeInteger(cents) || cents <= 0 ||
      cents > row.amount_cents - row.refunded_cents || !refundReason.trim()) {
      setMessage('Enter a valid refund amount and reason.'); return;
    }
    setSaving(true); setMessage('');
    const { data, error } = await supabase.functions.invoke('square-refund', {
      body: { paymentId: row.id, amountCents: cents, reason: refundReason.trim() },
    });
    setSaving(false);
    if (error || !data?.refundId) {
      setMessage('Refund status is uncertain. Check Square and refresh before retrying.');
      return;
    }
    setMessage(`Refund ${data.refundId}: ${data.status}. Refresh for final status.`);
    setRefundId(null); setRefundAmount(''); setRefundReason('');
    await refresh();
  }
  async function cancelReservation() {
    if (!cancelId || !cancelReason.trim() || saving) {
      setMessage('Enter a cancellation reason.'); return;
    }
    setSaving(true); setMessage('');
    const { data, error } = await supabase.rpc('ranch_cancel_paid_booking', {
      p_request_id: cancelId, p_reason: cancelReason.trim(),
    });
    setSaving(false);
    if (error || data !== true) {
      setMessage('Cancellation was not completed. All payments must be reconciled and refunded first.');
      return;
    }
    setCancelId(null); setCancelReason('');
    setMessage('Refunded reservation cancelled and recorded.');
    await refresh();
  }

  const filtered = rows.filter((r) => filter === 'ALL' || (filter === 'REFUNDED'
    ? r.refunded_cents > 0 : filter === 'REVIEW'
      ? r.requires_review || r.status === 'REVIEW' : r.status === filter));
  const collected = rows.filter((r) => ['PAID', 'PARTIAL_REFUND', 'REFUNDED'].includes(r.status))
    .reduce((sum, r) => sum + r.amount_cents - r.refunded_cents, 0);
  const outstanding = [...new Map(rows.filter((r) => r.request_id)
    .map((r) => [r.request_id, r.ranch_booking_requests?.balance_due_cents ?? 0])).values()]
    .reduce((sum, cents) => sum + cents, 0);
  const pending = rows.filter((r) => ['CREATED', 'OPEN', 'FAILED'].includes(r.status))
    .reduce((sum, r) => sum + r.amount_cents, 0);
  const refunds = rows.reduce((sum, r) => sum + r.refunded_cents, 0);

  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}>
    <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>‹ Back</Text></TouchableOpacity>
    <Text style={s.title}>Payments</Text>
    <Text style={s.note}>Square Sandbox records. Initial deposits confirm reservations only after verified payment.</Text>
    {!SQUARE_SANDBOX_CHECKOUT_ENABLED ? <Text style={s.note}>Payment tracking is disabled until Sandbox verification passes.</Text> : <>
      <View style={s.row}><TouchableOpacity onPress={() => void refresh()} style={s.button}><Text style={s.buttonText}>Refresh</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/payment-settings')} style={s.button}><Text style={s.buttonText}>Payment settings</Text></TouchableOpacity></View>
      {loading && <ActivityIndicator />}
      {!!message && <Text accessibilityLiveRegion="polite" style={s.note}>{message}</Text>}
      <View style={s.summary}><Text style={s.heading}>Collected {money(collected)}</Text>
        <Text style={s.text}>Unpaid links {money(pending)}</Text>
        <Text style={s.text}>Reservation balances due {money(outstanding)}</Text>
        <Text style={s.text}>Refunded {money(refunds)}</Text>
        <Text style={s.note}>Most recent 200 payment records; totals reflect this page.</Text></View>
      <View style={s.row}>{(['ALL', 'OPEN', 'PAID', 'FAILED', 'REFUNDED', 'REVIEW'] as const).map((value) =>
        <TouchableOpacity key={value} onPress={() => setFilter(value)} style={[s.tab, filter === value && s.tabActive]}>
          <Text style={s.text}>{value}</Text></TouchableOpacity>)}</View>
      {filtered.length === 0 && <Text style={s.note}>No matching transactions.</Text>}
      {filtered.map((r) => <View key={r.id} style={s.card}>
        <Text style={s.heading}>{r.ranch_booking_requests?.guest_name ?? r.ranch_day_pass_orders?.guest_name ?? 'Customer'} · {r.phase}</Text>
        <Text style={s.text}>{r.ranch_booking_requests?.unit ?? 'Day pass'} · {money(r.amount_cents)}</Text>
        <Text style={s.text}>Status: {r.status}{r.requires_review ? ' · STAFF REVIEW' : ''}</Text>
        {r.ranch_booking_requests && <><Text style={s.text}>Reservation total: ${Number(r.ranch_booking_requests.quoted_total).toFixed(2)}</Text>
          <Text style={s.text}>Outstanding: {money(r.ranch_booking_requests.balance_due_cents ?? 0)} · due {r.ranch_booking_requests.balance_due_on ?? '—'}</Text>
          <Text style={s.text}>Reservation: {r.ranch_booking_requests.status}</Text></>}
        {r.paid_at && <Text style={s.text}>Received: {new Date(r.paid_at).toLocaleString()}</Text>}
        {r.refunded_cents > 0 && <Text style={s.text}>Refunded: {money(r.refunded_cents)}</Text>}
        {r.square_payment_id && <Text selectable style={s.note}>Square payment {r.square_payment_id}</Text>}
        {r.receipt_number && <Text style={s.text}>Receipt {r.receipt_number}</Text>}
        {r.receipt_url && <TouchableOpacity onPress={() => void Linking.openURL(r.receipt_url!)}><Text style={s.link}>Open Square receipt</Text></TouchableOpacity>}
        <Text style={s.note}>Created {new Date(r.created_at).toLocaleString()}</Text>
        {['owner', 'admin'].includes(role) && r.square_payment_id &&
          ['PAID', 'PARTIAL_REFUND'].includes(r.status) && r.refunded_cents < r.amount_cents &&
          <TouchableOpacity onPress={() => { setRefundId(r.id); setRefundAmount(((r.amount_cents - r.refunded_cents) / 100).toFixed(2)); }} style={s.linkButton}>
            <Text style={s.link}>Request refund</Text></TouchableOpacity>}
        {refundId === r.id && <View style={s.refund}><Text style={s.heading}>Refund to original payment method</Text>
          <TextInput style={s.input} accessibilityLabel="Refund dollars" keyboardType="decimal-pad" value={refundAmount} onChangeText={setRefundAmount} />
          <TextInput style={s.input} accessibilityLabel="Refund reason" placeholder="Reason" value={refundReason} onChangeText={setRefundReason} maxLength={192} />
          <Text style={s.note}>A refund does not automatically cancel a reservation. Review the stay separately.</Text>
          <TouchableOpacity disabled={saving} onPress={() => void refund()} style={s.button}><Text style={s.buttonText}>{saving ? 'Submitting…' : 'Submit Sandbox refund'}</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setRefundId(null)}><Text style={s.link}>Cancel</Text></TouchableOpacity>
        </View>}
        {['owner', 'admin'].includes(role) && r.phase === 'INITIAL' &&
          r.ranch_booking_requests?.status === 'APPROVED' && r.request_id &&
          <TouchableOpacity onPress={() => setCancelId(r.request_id)} style={s.linkButton}>
            <Text style={s.link}>Cancel reservation after refunds</Text></TouchableOpacity>}
        {cancelId && cancelId === r.request_id && r.phase === 'INITIAL' && <View style={s.refund}>
          <Text style={s.heading}>Cancel refunded reservation</Text>
          <Text style={s.note}>The server requires every payment to be fully refunded first and records the reason.</Text>
          <TextInput style={s.input} accessibilityLabel="Cancellation reason" placeholder="Reason"
            value={cancelReason} onChangeText={setCancelReason} maxLength={500} />
          <TouchableOpacity disabled={saving} onPress={() => void cancelReservation()} style={s.button}>
            <Text style={s.buttonText}>{saving ? 'Saving…' : 'Cancel refunded reservation'}</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setCancelId(null)}><Text style={s.link}>Keep reservation</Text></TouchableOpacity>
        </View>}
      </View>)}
    </>}
  </ScrollView></SafeAreaView>;
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F1E8' },
  page: { padding: 20, maxWidth: 800, width: '100%', alignSelf: 'center', paddingBottom: 50 },
  back: { color: '#203B2A', marginBottom: 18 },
  title: { fontSize: 28, fontWeight: '800', color: '#203B2A' },
  note: { color: '#725A36', marginTop: 8, lineHeight: 19 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  button: { backgroundColor: '#203B2A', padding: 12, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontWeight: '800' },
  summary: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, marginTop: 18, gap: 8 },
  heading: { color: '#203B2A', fontWeight: '800', fontSize: 17 },
  text: { color: '#384F3C', fontSize: 14 },
  tab: { padding: 9, backgroundColor: '#E5E8DF', borderRadius: 8 },
  tabActive: { backgroundColor: '#D8C59D' },
  card: { backgroundColor: '#FFFFFF', padding: 18, borderRadius: 14, marginTop: 12, gap: 5 },
  link: { color: '#174F92', fontWeight: '700' },
  linkButton: { marginTop: 10 },
  refund: { padding: 14, backgroundColor: '#F4F1E8', gap: 10, borderRadius: 10 },
  input: { borderWidth: 1, borderColor: '#C4CABF', borderRadius: 8, padding: 10 },
});
