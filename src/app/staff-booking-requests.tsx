import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { STAFF_BOOKING_REQUESTS_ENABLED } from '../constants/feature-flags';
import type { BookingRequestStatus, StaffBookingRequest } from '../data/bookingRequests';
import { BOOKING_REQUEST_ERROR_TEXT, decideStaffBookingRequest, listStaffBookingRequests, type BookingRequestError } from '../repositories/booking-request-repository';

type Decision = 'APPROVED' | 'REJECTED';
const FILTERS: BookingRequestStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

export default function StaffBookingRequestsScreen() {
  const [requests, setRequests] = useState<StaffBookingRequest[]>([]);
  const [filter, setFilter] = useState<BookingRequestStatus>('PENDING');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Decision | null>(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<BookingRequestError | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const saveLock = useRef(false);
  const selected = requests.find((item) => item.requestId === selectedId) ?? null;

  async function refresh() {
    if (!STAFF_BOOKING_REQUESTS_ENABLED) return;
    setLoading(true); setError(null);
    const result = await listStaffBookingRequests();
    setRequests(result.requests); setError(result.error); setLoading(false);
  }
  useEffect(() => { void refresh(); }, []);

  async function decide() {
    if (!selected || !confirm || saveLock.current || selected.status !== 'PENDING') return;
    saveLock.current = true; setSaving(true); setError(null); setSuccess(null);
    try {
      const result = await decideStaffBookingRequest(selected.requestId, confirm, decisionNote);
      if (result) { setError(result); return; }
      setSuccess(confirm === 'APPROVED' ? 'Approved and saved as a confirmed reservation.' : 'Rejected. No reservation was created.');
      setConfirm(null); setDecisionNote('');
      await refresh();
    } finally { saveLock.current = false; setSaving(false); }
  }

  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
    <View style={s.hero}><TouchableOpacity accessibilityLabel="Back to staff dashboard" onPress={() => router.back()}><Text style={s.back}>‹ Back</Text></TouchableOpacity>
      <Text style={s.eyebrow}>WHITE OAK RANCH · STAFF ONLY</Text><Text style={s.title}>Booking requests</Text>
      <Text style={s.heroText}>Review customer requests. Pending requests do not hold inventory; approval checks the site and price again before creating a reservation.</Text>
    </View>
    <View style={s.content}>
      {!STAFF_BOOKING_REQUESTS_ENABLED ? <View style={s.notice}><Text style={s.noticeTitle}>Backend approval pending</Text><Text style={s.body}>No requests can be submitted or reviewed online yet. The intake migration must be installed and security-tested before this inbox is enabled.</Text></View> : <>
        <TouchableOpacity accessibilityRole="button" disabled={loading || saving} onPress={() => void refresh()} style={s.button}><Text style={s.buttonText}>{loading ? 'Loading…' : 'Refresh inbox'}</Text></TouchableOpacity>
        {loading && <ActivityIndicator color="#203B2A" />}
        {error && <View accessibilityLiveRegion="polite" style={s.notice}><Text style={s.noticeTitle}>Could not complete the action</Text><Text style={s.body}>{BOOKING_REQUEST_ERROR_TEXT[error]}</Text></View>}
        {success && <View accessibilityLiveRegion="polite" style={s.notice}><Text style={s.noticeTitle}>{success}</Text></View>}
        <Text style={s.caption}>Showing the 200 most recent requests. Counts below reflect this list.</Text>
        <View style={s.tabs}>{FILTERS.map((status) => <TouchableOpacity key={status} accessibilityRole="tab" accessibilityState={{ selected: filter === status }} onPress={() => { setFilter(status); setSelectedId(null); setConfirm(null); }} style={[s.tab, filter === status && s.tabActive]}><Text style={s.tabText}>{status} ({requests.filter((item) => item.status === status).length})</Text></TouchableOpacity>)}</View>
        {!loading && requests.filter((item) => item.status === filter).length === 0 && <View style={s.notice}><Text style={s.noticeTitle}>No {filter.toLowerCase()} requests</Text><Text style={s.body}>Refresh to check for new requests.</Text></View>}
        {requests.filter((item) => item.status === filter).map((item) => <TouchableOpacity key={item.requestId} accessibilityRole="button" onPress={() => { setSelectedId(item.requestId); setConfirm(null); setDecisionNote(''); }} style={[s.card, selectedId === item.requestId && s.cardSelected]}>
          <Text style={s.cardTitle}>{item.guestName} · {item.unit}</Text><Text style={s.body}>{item.arrival} to {item.departure} · ${item.quotedTotal}</Text>
          <Text style={s.caption}>{item.status} · submitted {new Date(item.submittedAt).toLocaleString()}</Text>
        </TouchableOpacity>)}
        {selected && <View style={s.detail}>
          <Text style={s.detailTitle}>Request details</Text><Text selectable style={s.caption}>Reference {selected.requestId}</Text>
          <Text style={s.body}>Guest: {selected.guestName}</Text><Text style={s.body}>Contact: {[selected.email, selected.phone].filter(Boolean).join(' · ')}</Text>
          <Text style={s.body}>Stay: {selected.stayType} · {selected.unit}</Text>
          <Text style={s.body}>Dates: {selected.arrival} to {selected.departure}</Text>
          <Text style={s.body}>Service: {selected.rvService ?? 'Not applicable'} · {selected.guests} guests · ATV {selected.atvAccess ? 'yes' : 'no'}</Text>
          <Text style={s.body}>Submitted quote: ${selected.quotedTotal}</Text>
          {selected.note ? <Text style={s.body}>Guest note: {selected.note}</Text> : null}
          {selected.decisionNote ? <Text style={s.body}>Decision note: {selected.decisionNote}</Text> : null}
          {selected.decidedAt ? <Text style={s.caption}>Decided {new Date(selected.decidedAt).toLocaleString()}</Text> : null}
          {selected.reservationId ? <Text selectable style={s.caption}>Reservation {selected.reservationId}</Text> : null}
          {selected.status === 'PENDING' && <>
            <Text style={s.warning}>Approval creates a confirmed reservation. Recheck the details and contact the guest separately; no email is sent automatically.</Text>
            <View style={s.actionRow}><TouchableOpacity disabled={saving} onPress={() => setConfirm('APPROVED')} style={s.button}><Text style={s.buttonText}>Approve</Text></TouchableOpacity><TouchableOpacity disabled={saving} onPress={() => setConfirm('REJECTED')} style={s.outline}><Text style={s.outlineText}>Reject</Text></TouchableOpacity></View>
            {confirm && <View style={s.confirm}><Text style={s.noticeTitle}>Confirm {confirm.toLowerCase()}?</Text>
              <Text style={s.body}>{confirm === 'APPROVED' ? 'The server will recheck availability and pricing, then atomically create a confirmed reservation.' : 'This keeps the request history and creates no reservation.'}</Text>
              <TextInput accessibilityLabel="Decision note, optional" placeholder="Internal note (optional)" value={decisionNote} maxLength={500} multiline onChangeText={setDecisionNote} style={s.input} />
              <View style={s.actionRow}><TouchableOpacity disabled={saving} onPress={() => void decide()} style={s.button}><Text style={s.buttonText}>{saving ? 'Saving…' : `Yes, ${confirm.toLowerCase()}`}</Text></TouchableOpacity><TouchableOpacity disabled={saving} onPress={() => setConfirm(null)} style={s.outline}><Text style={s.outlineText}>Keep pending</Text></TouchableOpacity></View>
            </View>}
          </>}
        </View>}
      </>}
    </View>
  </ScrollView></SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F1E8' }, page: { paddingBottom: 50 },
  hero: { backgroundColor: '#203B2A', padding: 24 }, back: { color: '#D8C59D', fontSize: 16, marginBottom: 20 }, eyebrow: { color: '#D8C59D', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  title: { color: '#FFFFFF', fontSize: 32, fontWeight: '800', marginTop: 8 }, heroText: { color: '#DFE5DD', fontSize: 14, lineHeight: 21, marginTop: 9, maxWidth: 600 },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 18 }, notice: { backgroundColor: '#FFF8E8', borderRadius: 14, padding: 17, marginTop: 12 }, noticeTitle: { color: '#203B2A', fontSize: 16, fontWeight: '800' },
  body: { color: '#536154', fontSize: 14, lineHeight: 21, marginTop: 6 }, caption: { color: '#697569', fontSize: 12, marginTop: 7 },
  button: { backgroundColor: '#D8C59D', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 12, minWidth: 120 }, buttonText: { color: '#203B2A', fontWeight: '800' },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 }, tab: { backgroundColor: '#E5E8DF', padding: 10, borderRadius: 10 }, tabActive: { backgroundColor: '#D8C59D' }, tabText: { color: '#203B2A', fontSize: 12, fontWeight: '800' },
  card: { backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#FFFFFF', borderRadius: 12, padding: 15, marginTop: 10 }, cardSelected: { borderColor: '#9B7952' }, cardTitle: { color: '#203B2A', fontSize: 16, fontWeight: '800' },
  detail: { backgroundColor: '#FFFFFF', borderRadius: 15, padding: 18, marginTop: 18 }, detailTitle: { color: '#203B2A', fontSize: 22, fontWeight: '800' },
  warning: { color: '#965A34', fontSize: 13, lineHeight: 19, marginTop: 16 }, actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, outline: { borderWidth: 1, borderColor: '#9B7952', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 12, minWidth: 120 }, outlineText: { color: '#203B2A', fontWeight: '800' },
  confirm: { backgroundColor: '#F5F1E6', borderRadius: 12, padding: 14, marginTop: 12 }, input: { backgroundColor: '#FFFFFF', borderColor: '#DDD9CE', borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 12, minHeight: 44, color: '#203B2A' },
});
