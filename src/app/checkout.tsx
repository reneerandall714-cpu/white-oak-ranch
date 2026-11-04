import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SQUARE_SANDBOX_CHECKOUT_ENABLED } from '../constants/feature-flags';
import { supabase } from '../lib/supabase';

type Quote = {
  unit: string; arrival: string; departure: string; status: string;
  totalCents: number; depositCents: number | null; depositAvailable: boolean;
  proposedBalanceDueOn: string | null; expiresAt: string | null;
  choice: 'FULL' | 'DEPOSIT' | null; initialDueCents: number | null;
  balanceCents: number | null; balanceDueOn: string | null;
};
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function CheckoutScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [choice, setChoice] = useState<'FULL' | 'DEPOSIT'>('FULL');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function refresh() {
    if (!token || !SQUARE_SANDBOX_CHECKOUT_ENABLED) return;
    setLoading(true);
    const { data, error: requestError } = await supabase.functions.invoke('square-checkout', {
      body: { action: 'quote', token },
    });
    setLoading(false);
    if (requestError || !data?.status) { setError('Could not retrieve checkout status. Contact the ranch.'); return; }
    setQuote(data as Quote);
    if (data.choice === 'FULL' || data.choice === 'DEPOSIT') setChoice(data.choice);
    setError('');
  }
  useEffect(() => { void refresh(); }, [token]);

  async function openCheckout(action: 'initial' | 'balance') {
    if (busy || !token) return;
    setBusy(true); setError('');
    try {
      const { data, error: requestError } = await supabase.functions.invoke('square-checkout', {
        body: { action, token, choice },
      });
      if (requestError || typeof data?.url !== 'string') throw new Error('Checkout is unavailable');
      await Linking.openURL(data.url);
      // The Square page is only a payment attempt. Refresh from the backend
      // after returning; never treat its redirect as proof of payment.
    } catch {
      setError('Could not open Square checkout. Refresh your status or call the ranch.');
    } finally { setBusy(false); }
  }

  const dueToday = quote?.choice && quote.initialDueCents
    ? quote.initialDueCents
    : choice === 'DEPOSIT' && quote?.depositAvailable
      ? quote.depositCents ?? 0 : quote?.totalCents ?? 0;
  const balance = (quote?.totalCents ?? 0) - dueToday;
  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}>
    <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>‹ Back</Text></TouchableOpacity>
    <Text style={s.title}>Reservation checkout</Text>
    <Text style={s.notice}>Square Sandbox test checkout. No live payment is collected.</Text>
    {!SQUARE_SANDBOX_CHECKOUT_ENABLED && <Text style={s.notice}>Checkout is not available yet. Contact the ranch.</Text>}
    {loading && <ActivityIndicator />}
    {error ? <Text accessibilityLiveRegion="polite" style={s.error}>{error}</Text> : null}
    {quote && <View style={s.card}>
      <Text style={s.heading}>{quote.unit}</Text>
      <Text style={s.text}>{quote.arrival} to {quote.departure}</Text>
      <Text style={s.text}>Status: {quote.status.replaceAll('_', ' ')}</Text>
      <Text style={s.text}>Reservation total: {money(quote.totalCents)}</Text>
      {quote.status === 'AWAITING_PAYMENT' && <>
        <Text style={s.text}>Hold expires: {quote.expiresAt ? new Date(quote.expiresAt).toLocaleString() : 'Unavailable'}</Text>
        <TouchableOpacity disabled={!!quote.choice} accessibilityRole="radio" accessibilityState={{ selected: choice === 'FULL' }}
          onPress={() => setChoice('FULL')} style={[s.choice, choice === 'FULL' && s.chosen]}>
          <Text style={s.heading}>Pay in Full</Text>
        </TouchableOpacity>
        {(quote.depositAvailable || quote.choice === 'DEPOSIT') && <TouchableOpacity disabled={!!quote.choice} accessibilityRole="radio"
          accessibilityState={{ selected: choice === 'DEPOSIT' }} onPress={() => setChoice('DEPOSIT')}
          style={[s.choice, choice === 'DEPOSIT' && s.chosen]}>
          <Text style={s.heading}>Pay Deposit</Text>
        </TouchableOpacity>}
        {quote.choice && <Text style={s.notice}>Payment choice locked: {quote.choice === 'FULL' ? 'Pay in Full' : 'Pay Deposit'}</Text>}
        <Text style={s.text}>Due today: {money(dueToday)}</Text>
        <Text style={s.text}>Remaining balance: {money(balance)}</Text>
        {balance > 0 && <Text style={s.text}>Balance due: {quote.balanceDueOn ?? quote.proposedBalanceDueOn}</Text>}
        <TouchableOpacity disabled={busy} onPress={() => void openCheckout('initial')} style={s.button}>
          <Text style={s.buttonText}>{busy ? 'Opening…' : 'Continue to Square Sandbox'}</Text>
        </TouchableOpacity>
      </>}
      {quote.status === 'APPROVED' && <>
        <Text style={s.notice}>Initial payment verified. Your reservation is confirmed.</Text>
        {!!quote.balanceCents && <><Text style={s.text}>Outstanding balance: {money(quote.balanceCents)}</Text>
          <Text style={s.text}>Due: {quote.balanceDueOn}</Text>
          <TouchableOpacity disabled={busy} onPress={() => void openCheckout('balance')} style={s.button}>
            <Text style={s.buttonText}>Pay remaining balance in Square</Text>
          </TouchableOpacity></>}
      </>}
      {quote.status === 'EXPIRED' && <Text style={s.error}>The unpaid hold expired. Contact the ranch to request another site.</Text>}
      <TouchableOpacity onPress={() => void refresh()} style={s.refresh}><Text style={s.heading}>Refresh payment status</Text></TouchableOpacity>
    </View>}
  </ScrollView></SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F1E8' },
  page: { padding: 20, paddingBottom: 50, maxWidth: 640, width: '100%', alignSelf: 'center' },
  back: { color: '#203B2A', marginBottom: 18 },
  title: { fontSize: 28, fontWeight: '800', color: '#203B2A' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginTop: 20, gap: 10 },
  heading: { fontSize: 16, fontWeight: '800', color: '#203B2A' },
  text: { fontSize: 15, color: '#384F3C' },
  notice: { color: '#725A36', marginTop: 12, lineHeight: 20 },
  error: { color: '#9B3628', marginTop: 12 },
  choice: { padding: 16, borderWidth: 1, borderColor: '#C4CABF', borderRadius: 12 },
  chosen: { borderColor: '#203B2A', backgroundColor: '#EDF3E8' },
  button: { backgroundColor: '#203B2A', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#FFFFFF', fontWeight: '800' },
  refresh: { padding: 14, alignItems: 'center' },
});
