import { router } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SQUARE_SANDBOX_CHECKOUT_ENABLED } from '../constants/feature-flags';
import { supabase } from '../lib/supabase';

type Rates = { enabled: boolean; primaryCents: number; additionalCents: number; atvCents: number };
const money = (value: number) => `$${(value / 100).toFixed(2)}`;

export default function DayPassScreen() {
  const [rates, setRates] = useState<Rates | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [additional, setAdditional] = useState(0);
  const [atv, setAtv] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const key = useRef<string | null>(null);
  const lastDetails = useRef('');

  useEffect(() => {
    if (!SQUARE_SANDBOX_CHECKOUT_ENABLED) return;
    void supabase.functions.invoke('square-checkout', { body: { action: 'day_pass_quote' } })
      .then(({ data, error }) => {
        if (!error && data) setRates(data as Rates);
        else setMessage('Day pass rates are unavailable. Contact the ranch.');
      });
  }, []);
  const total = rates ? rates.primaryCents + rates.additionalCents * additional + (atv ? rates.atvCents : 0) : 0;

  async function checkout() {
    if (busy || !rates?.enabled) return;
    if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(visitDate)) {
      setMessage('Enter your name, email, and a visit date in YYYY-MM-DD format.');
      return;
    }
    const details = JSON.stringify([name.trim(), email.trim(), visitDate, additional, atv]);
    if (lastDetails.current !== details || !key.current) {
      key.current = randomUUID();
      lastDetails.current = details;
    }
    setBusy(true); setMessage('');
    try {
      const { data, error } = await supabase.functions.invoke('square-checkout', {
        body: { action: 'day_pass', key: key.current, name: name.trim(),
          email: email.trim(), visitDate, additional, atv },
      });
      if (error || typeof data?.url !== 'string') throw new Error('Checkout unavailable');
      await Linking.openURL(data.url);
      setMessage('Square checkout opened. Payment status is confirmed by the ranch after Square verifies it.');
    } catch {
      setMessage('Checkout status is uncertain. Retry with the same details to reuse the payment link, or contact the ranch.');
    } finally { setBusy(false); }
  }

  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}>
    <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>‹ Back</Text></TouchableOpacity>
    <Text style={s.title}>Day Pass</Text>
    <Text style={s.note}>Square Sandbox checkout is available after the owner approves day pass rates. No live payment is collected.</Text>
    {!SQUARE_SANDBOX_CHECKOUT_ENABLED && <Text style={s.note}>Online day pass checkout is not available yet.</Text>}
    {SQUARE_SANDBOX_CHECKOUT_ENABLED && !rates && <ActivityIndicator />}
    {rates && !rates.enabled && <Text style={s.note}>Day pass pricing has not been activated by the owner.</Text>}
    {rates?.enabled && <View style={s.card}>
      <Text style={s.heading}>Visit details</Text>
      <TextInput style={s.input} accessibilityLabel="Guest name" placeholder="Guest name" value={name} onChangeText={setName} maxLength={200} />
      <TextInput style={s.input} accessibilityLabel="Email" placeholder="Email for receipt" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" maxLength={254} />
      <TextInput style={s.input} accessibilityLabel="Visit date" placeholder="YYYY-MM-DD" value={visitDate} onChangeText={setVisitDate} maxLength={10} />
      <Text style={s.text}>Primary pass: {money(rates.primaryCents)}</Text>
      <Text style={s.text}>Additional passes: {additional} × {money(rates.additionalCents)}</Text>
      <View style={s.row}><TouchableOpacity onPress={() => setAdditional(Math.max(0, additional - 1))} style={s.small}><Text>−</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setAdditional(Math.min(20, additional + 1))} style={s.small}><Text>+</Text></TouchableOpacity></View>
      <TouchableOpacity onPress={() => setAtv(!atv)} style={s.choice}><Text style={s.text}>{atv ? '✓ ' : '○ '}ATV / SxS access: {money(rates.atvCents)}</Text></TouchableOpacity>
      <Text style={s.heading}>Total due today: {money(total)}</Text>
      <TouchableOpacity disabled={busy} onPress={() => void checkout()} style={s.button}>
        <Text style={s.buttonText}>{busy ? 'Opening…' : 'Continue to Square Sandbox'}</Text>
      </TouchableOpacity>
    </View>}
    {!!message && <Text accessibilityLiveRegion="polite" style={s.note}>{message}</Text>}
  </ScrollView></SafeAreaView>;
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F1E8' },
  page: { padding: 20, paddingBottom: 50, maxWidth: 640, width: '100%', alignSelf: 'center' },
  back: { color: '#203B2A', marginBottom: 18 },
  title: { fontSize: 28, fontWeight: '800', color: '#203B2A' },
  note: { color: '#725A36', lineHeight: 20, marginTop: 12 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginTop: 20, gap: 12 },
  heading: { fontSize: 17, fontWeight: '800', color: '#203B2A' },
  text: { color: '#384F3C', fontSize: 15 },
  input: { borderWidth: 1, borderColor: '#C4CABF', borderRadius: 8, padding: 12, minHeight: 44 },
  row: { flexDirection: 'row', gap: 10 },
  small: { padding: 12, backgroundColor: '#DCE7DA', borderRadius: 8 },
  choice: { padding: 12, backgroundColor: '#F4F1E8', borderRadius: 8 },
  button: { backgroundColor: '#203B2A', padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontWeight: '800' },
});
