import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SQUARE_SANDBOX_CHECKOUT_ENABLED } from '../constants/feature-flags';
import { supabase } from '../lib/supabase';

type Settings = {
  deposit_type: 'FULL' | 'FIXED' | 'PERCENT';
  deposit_value: number;
  balance_due_days_before_arrival: number;
  day_pass_enabled: boolean;
  day_pass_primary_cents: number;
  day_pass_additional_cents: number;
  atv_day_cents: number;
};
export default function PaymentSettingsScreen() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [role, setRole] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function load() {
    if (!SQUARE_SANDBOX_CHECKOUT_ENABLED) return;
    const [{ data, error }, user] = await Promise.all([
      supabase.from('ranch_payment_settings').select('*').eq('id', true).single(),
      supabase.auth.getUser(),
    ]);
    if (error || !data) { setMessage('Payment settings are unavailable.'); return; }
    setSettings(data as Settings);
    if (user.data.user) {
      const result = await supabase.from('ranch_staff').select('role').eq('user_id', user.data.user.id).maybeSingle();
      setRole(result.data?.role ?? '');
    }
  }
  useEffect(() => { void load(); }, []);
  async function save() {
    if (!settings || role !== 'owner' || busy) return;
    setBusy(true); setMessage('');
    const { error } = await supabase.from('ranch_payment_settings').update({
      deposit_type: settings.deposit_type,
      deposit_value: settings.deposit_type === 'FULL' ? 0 : settings.deposit_value,
      balance_due_days_before_arrival: settings.balance_due_days_before_arrival,
      day_pass_enabled: settings.day_pass_enabled,
      day_pass_primary_cents: settings.day_pass_primary_cents,
      day_pass_additional_cents: settings.day_pass_additional_cents,
      atv_day_cents: settings.atv_day_cents,
      updated_at: new Date().toISOString(),
    }).eq('id', true);
    setMessage(error ? 'Settings were not saved. Check deposit amount, role, and connection.' : 'Sandbox payment settings saved.');
    setBusy(false);
  }
  function numberField(label: string, key: 'deposit_value' | 'balance_due_days_before_arrival' |
    'day_pass_primary_cents' | 'day_pass_additional_cents' | 'atv_day_cents') {
    return <View style={s.field} key={key}><Text style={s.label}>{label}</Text>
      <TextInput style={s.input} accessibilityLabel={label} keyboardType="decimal-pad"
        editable={role === 'owner'} value={String(settings?.[key] ?? '')}
        onChangeText={(value) => setSettings((old) => old ? { ...old, [key]: Number(value) } : old)} /></View>;
  }
  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}>
    <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>‹ Back</Text></TouchableOpacity>
    <Text style={s.title}>Payment settings</Text>
    <Text style={s.note}>Owner settings for Square Sandbox. No production payment collection is enabled.</Text>
    {!SQUARE_SANDBOX_CHECKOUT_ENABLED && <Text style={s.note}>Sandbox backend verification is required before editing settings.</Text>}
    {settings && <View style={s.card}>
      <Text style={s.heading}>Reservation payment policy</Text>
      <Text style={s.note}>Full payment is always available. Enable one deposit formula below.</Text>
      <View style={s.row}>{(['FULL', 'FIXED', 'PERCENT'] as const).map((type) =>
        <TouchableOpacity key={type} disabled={role !== 'owner'} onPress={() => setSettings({ ...settings, deposit_type: type })}
          style={[s.option, settings.deposit_type === type && s.selected]}>
          <Text style={s.label}>{type}</Text>
        </TouchableOpacity>)}</View>
      {settings.deposit_type !== 'FULL' && numberField(settings.deposit_type === 'FIXED'
        ? 'Deposit amount in dollars' : 'Deposit percentage (0–100)', 'deposit_value')}
      {numberField('Balance due days before arrival', 'balance_due_days_before_arrival')}
      <Text style={s.note}>Deposits are unavailable when their due date has passed. Existing issued links keep their recorded terms.</Text>
      <Text style={s.heading}>Day pass pricing</Text>
      <TouchableOpacity disabled={role !== 'owner'} onPress={() => setSettings({ ...settings, day_pass_enabled: !settings.day_pass_enabled })}
        style={s.option}><Text style={s.label}>{settings.day_pass_enabled ? '✓' : '○'} Day pass checkout enabled</Text></TouchableOpacity>
      {numberField('Primary pass cents', 'day_pass_primary_cents')}
      {numberField('Additional pass cents', 'day_pass_additional_cents')}
      {numberField('ATV day access cents', 'atv_day_cents')}
      {role === 'owner' && <TouchableOpacity disabled={busy} onPress={() => void save()} style={s.button}>
        <Text style={s.buttonText}>{busy ? 'Saving…' : 'Save Sandbox settings'}</Text></TouchableOpacity>}
      {role !== 'owner' && <Text style={s.note}>Only the active owner account can change these settings.</Text>}
    </View>}
    {!!message && <Text accessibilityLiveRegion="polite" style={s.note}>{message}</Text>}
  </ScrollView></SafeAreaView>;
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F1E8' },
  page: { padding: 20, maxWidth: 680, width: '100%', alignSelf: 'center', paddingBottom: 50 },
  back: { color: '#203B2A', marginBottom: 18 },
  title: { fontSize: 28, fontWeight: '800', color: '#203B2A' },
  note: { color: '#725A36', marginTop: 10, lineHeight: 19 },
  card: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, marginTop: 20, gap: 14 },
  heading: { fontSize: 18, fontWeight: '800', color: '#203B2A', marginTop: 12 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  option: { padding: 12, backgroundColor: '#ECEFE9', borderRadius: 8 },
  selected: { borderWidth: 2, borderColor: '#203B2A' },
  field: { gap: 4 },
  label: { color: '#203B2A', fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#C4CABF', padding: 10, borderRadius: 8 },
  button: { backgroundColor: '#203B2A', padding: 16, alignItems: 'center', borderRadius: 10 },
  buttonText: { color: '#FFFFFF', fontWeight: '800' },
});
