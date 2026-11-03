import { router } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { useRef, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CUSTOMER_REQUEST_SUBMISSION_ENABLED, PUBLIC_AVAILABILITY_ENABLED } from '../constants/feature-flags';
import { validateBookingRequest, type BookingRequestDraft, type BookingRequestReceipt } from '../data/bookingRequests';
import { availableUnitsForStay, CUSTOMER_STAY_TYPES, maxGuestsForStay, validateStayDates, type CustomerStayChoice, type PublicUnit } from '../data/customerAvailability';
import { calculateLiveStayPricing } from '../data/liveReservationPricing';
import { RANCH_CONFIG, type RVServiceName } from '../data/ranchConfig';
import { getPublicAvailability, type PublicAvailabilityError } from '../repositories/customer-availability-repository';
import { BOOKING_REQUEST_ERROR_TEXT, submitBookingRequest, type BookingRequestError } from '../repositories/booking-request-repository';

const STAYS: { key: CustomerStayChoice; title: string; details: string; rate: string }[] = [
  { key: 'rv-site', title: 'RV site', details: '11 sites · choose your service', rate: 'From $25/night' },
  { key: 'tent', title: 'Tent campsite', details: '10 sites · up to 6 guests', rate: '$25/night' },
  { key: 'small-rv', title: 'Small rental RV', details: 'Sleeps up to 5', rate: '$75/night' },
  { key: 'large-rv', title: 'Large rental RV', details: 'Sleeps up to 8', rate: '$99/night' },
];
const SERVICES: { name: RVServiceName; details: string; rate: string }[] = [
  { name: 'Parking Only', details: 'No hookups', rate: '$25/night' },
  { name: 'Electric + Water', details: 'Electric and water', rate: '$40/night' },
  { name: 'Deluxe', details: 'Full hookup · electric, water, septic, Wi-Fi', rate: '$50/night · $200/7 nights' },
];
const ERRORS: Record<PublicAvailabilityError, string> = {
  pending_approval: 'Live availability awaits approval of a secure database endpoint. No sites can be shown or requested online yet. Call the ranch to check your dates.',
  validation: 'The database did not accept those dates. Please review them and retry.',
  connectivity: 'Could not connect to live availability. Check your connection and retry.',
  unavailable: 'Live availability is temporarily unavailable. Please retry or call the ranch.',
};

export default function BookingScreen() {
  const [arrival, setArrival] = useState('');
  const [departure, setDeparture] = useState('');
  const [choice, setChoice] = useState<CustomerStayChoice | null>(null);
  const [service, setService] = useState<RVServiceName | null>(null);
  const [guests, setGuests] = useState(2);
  const [atv, setAtv] = useState(false);
  const [units, setUnits] = useState<PublicUnit[]>([]);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PublicAvailabilityError | null>(null);
  const [preview, setPreview] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<BookingRequestError | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [submission, setSubmission] = useState<{ receipt: BookingRequestReceipt; draft: BookingRequestDraft } | null>(null);
  const submitLock = useRef(false);
  const requestKey = useRef<{ fingerprint: string; key: string } | null>(null);
  const sequence = useRef(0);
  const stayType = choice ? CUSTOMER_STAY_TYPES[choice] : null;
  const date = validateStayDates(arrival, departure);
  const capacity = stayType ? maxGuestsForStay(stayType) : 8;
  const canQuote = Boolean(stayType && date.nights > 0 && (choice !== 'rv-site' || service));
  const quote = canQuote ? calculateLiveStayPricing({ stayType: stayType!, rvService: service ?? undefined, nights: date.nights, atvAccess: atv }) : null;
  const matching = units.filter((unit) => unit.stayType === stayType);
  const available = stayType ? availableUnitsForStay(units, stayType) : [];
  const canPreview = searched && !loading && !error && Boolean(unitId && available.some((unit) => unit.unitId === unitId)) && canQuote && guests >= 1 && guests <= capacity;

  function resetRequest() {
    setSubmitError(null);
    setValidationMessage(null);
    setPreview(false);
  }

  function resetAvailability() {
    sequence.current += 1;
    setUnits([]); setUnitId(null); setSearched(false); setLoading(false); setError(null); resetRequest();
  }
  async function checkAvailability() {
    if (!stayType || date.error || !PUBLIC_AVAILABILITY_ENABLED) return;
    const current = ++sequence.current;
    setSearched(true); setLoading(true); setError(null); setUnitId(null); resetRequest();
    const result = await getPublicAvailability(arrival, departure);
    if (current !== sequence.current) return;
    setUnits(result.units); setError(result.error); setLoading(false);
  }

  async function submitRequest() {
    if (submitLock.current || !CUSTOMER_REQUEST_SUBMISSION_ENABLED || !canPreview || !stayType || !unitId) return;
    const draft = { guestName, email, phone, note, unit: unitId, stayType, rvService: choice === 'rv-site' ? service : null,
      arrival, departure, guests, atvAccess: atv };
    const validation = validateBookingRequest(draft);
    if (validation) { setValidationMessage(validation); setSubmitError('validation'); return; }
    submitLock.current = true;
    setSubmitting(true); setSubmitError(null);
    try {
      // Reuse the same key after a timeout or refresh with identical details.
      const fingerprint = JSON.stringify(draft);
      if (requestKey.current?.fingerprint !== fingerprint) requestKey.current = { fingerprint, key: randomUUID() };
      const result = await submitBookingRequest(draft, requestKey.current.key);
      if (result.receipt) setSubmission({ receipt: result.receipt, draft });
      else setSubmitError(result.error ?? 'unavailable');
    } catch { setSubmitError('unavailable'); }
    finally { submitLock.current = false; setSubmitting(false); }
  }

  if (submission) return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={[s.content, { paddingTop: 38 }]}>
    <Text style={s.kicker}>WHITE OAK RANCH</Text><Text style={s.heading}>Request received</Text>
    <Notice title={submission.receipt.status === 'PENDING' ? 'PENDING REVIEW' : submission.receipt.status}
      message="Staff must review and confirm this request. This receipt is not a reservation, a site hold or a payment. Availability may change before approval." />
    <View style={[s.summary, { marginTop: 20 }]}>
      <Text style={s.summaryKicker}>REQUEST REFERENCE</Text><Text selectable style={s.summaryTitle}>{submission.receipt.requestId}</Text>
      <Text style={s.summarySub}>{submission.draft.unit} · {submission.draft.stayType} · {submission.draft.arrival} to {submission.draft.departure}</Text>
      <Text style={s.summarySub}>{submission.draft.guests} guests · {submission.draft.rvService ?? 'No RV service'} · ATV {submission.draft.atvAccess ? 'yes' : 'no'}</Text>
      <View style={s.total}><Text style={s.totalText}>Quoted total</Text><Text style={s.totalAmount}>${submission.receipt.quotedTotal}</Text></View>
    </View>
    <Text style={s.hint}>Save the reference and contact the ranch if you need to follow up. No confirmation email is sent yet.</Text>
    <TouchableOpacity style={s.button} onPress={() => router.replace('/')}><Text style={s.buttonText}>Return home</Text></TouchableOpacity>
  </ScrollView></SafeAreaView>;

  return <SafeAreaView style={s.safe}>
    <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
      <View style={s.hero}>
        <TouchableOpacity accessibilityLabel="Go back" onPress={() => router.back()} style={s.back}><Text style={s.backText}>‹</Text></TouchableOpacity>
        <Text style={s.eyebrow}>WHITE OAK RANCH · DUNLAP, TENNESSEE</Text>
        <Text style={s.title}>Plan your stay</Text>
        <Text style={s.heroText}>Find open space under the oaks. Explore dates, a site and a transparent price.</Text>
        <Text style={s.pill}>{CUSTOMER_REQUEST_SUBMISSION_ENABLED ? 'REQUEST A STAY · STAFF CONFIRMATION REQUIRED' : 'REQUEST PREVIEW ONLY · NO ONLINE BOOKING'}</Text>
      </View>
      <View style={s.content}>
        <Text style={s.kicker}>01 · WHEN</Text><Text style={s.heading}>Pick your dates</Text>
        <View style={s.dates}>
          <View style={s.dateField}><Text style={s.label}>ARRIVAL</Text><TextInput accessibilityLabel="Arrival date" placeholder="YYYY-MM-DD" placeholderTextColor="#8B918B" style={s.input} value={arrival} maxLength={10} autoCapitalize="none" keyboardType="numbers-and-punctuation" onChangeText={(value) => { setArrival(value); resetAvailability(); }} /></View>
          <View style={s.dateField}><Text style={s.label}>DEPARTURE</Text><TextInput accessibilityLabel="Departure date" placeholder="YYYY-MM-DD" placeholderTextColor="#8B918B" style={s.input} value={departure} maxLength={10} autoCapitalize="none" keyboardType="numbers-and-punctuation" onChangeText={(value) => { setDeparture(value); resetAvailability(); }} /></View>
        </View>
        {arrival || departure ? <Text style={date.error ? s.error : s.hint}>{date.error ?? `${date.nights} night${date.nights === 1 ? '' : 's'} · checkout day is not charged`}</Text> : null}

        <Text style={s.kicker}>02 · WHERE</Text><Text style={s.heading}>Choose your stay</Text>
        <View style={s.grid}>{STAYS.map((stay) => <TouchableOpacity key={stay.key} accessibilityRole="radio" accessibilityState={{ selected: choice === stay.key }} style={[s.card, choice === stay.key && s.selected]} onPress={() => { setChoice(stay.key); setService(null); setGuests(2); resetAvailability(); }}>
          <Text style={s.cardTitle}>{stay.title}</Text><Text style={s.muted}>{stay.details}</Text><Text style={s.rate}>{stay.rate}</Text>
        </TouchableOpacity>)}</View>

        {choice === 'rv-site' && <View style={s.services}><Text style={s.label}>RV SERVICE</Text>{SERVICES.map((item) => <TouchableOpacity key={item.name} accessibilityRole="radio" accessibilityState={{ selected: service === item.name }} style={[s.service, service === item.name && s.selected]} onPress={() => { setService(item.name); resetRequest(); }}>
          <Text style={s.cardTitle}>{item.name}</Text><Text style={s.muted}>{item.details}</Text><Text style={s.rate}>{item.rate}</Text>
        </TouchableOpacity>)}<Text style={s.hint}>Only Deluxe full-hookup has the $200 complete 7-night rate. Other RV services use nightly rates in this preview; advertised weekly offers need staff confirmation.</Text></View>}

        {stayType && <>
          <View style={s.guestRow}><View><Text style={s.label}>GUESTS</Text><Text style={s.hint}>Up to {capacity} for this request</Text></View><View style={s.stepper}>
            <TouchableOpacity accessibilityLabel="Remove guest" accessibilityState={{ disabled: guests <= 1 }} disabled={guests <= 1} style={s.stepButton} onPress={() => { setGuests(Math.max(1, guests - 1)); resetRequest(); }}><Text style={s.stepText}>−</Text></TouchableOpacity>
            <Text style={s.guestNumber}>{guests}</Text>
            <TouchableOpacity accessibilityLabel="Add guest" accessibilityState={{ disabled: guests >= capacity }} disabled={guests >= capacity} style={s.stepButton} onPress={() => { setGuests(Math.min(capacity, guests + 1)); resetRequest(); }}><Text style={s.stepText}>+</Text></TouchableOpacity>
          </View></View>
          <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: atv }} style={[s.service, atv && s.selected]} onPress={() => { setAtv(!atv); resetRequest(); }}><Text style={s.cardTitle}>{atv ? '✓ ' : '○ '}Bring an ATV / SxS</Text><Text style={s.rate}>+$75 per stay</Text></TouchableOpacity>

          <Text style={s.kicker}>03 · AVAILABILITY</Text><Text style={s.heading}>Find an open site</Text>
          <Text style={s.hint}>These results are live for your selected dates, not a hold. Staff must confirm any stay.</Text>
          {!PUBLIC_AVAILABILITY_ENABLED ? <Notice title="Live availability pending approval" message={ERRORS.pending_approval} /> : <>
            <TouchableOpacity style={[s.button, (Boolean(date.error) || loading) && s.disabled]} disabled={Boolean(date.error) || loading} onPress={() => void checkAvailability()}><Text style={s.buttonText}>{loading ? 'Checking dates…' : searched ? 'Refresh availability' : 'Check availability'}</Text></TouchableOpacity>
            {loading && <View style={s.loading}><ActivityIndicator color="#203B2A" /><Text style={s.hint}>Checking live sites…</Text></View>}
            {error && <Notice title="Could not check sites" message={ERRORS[error]} />}
            {searched && !loading && !error && available.length === 0 && <Notice title="No sites available" message="Try other dates or another stay type. Availability may change before staff confirms a request." />}
            {searched && !loading && !error && <Text style={s.hint}>{available.length} of {matching.length} {stayType.toLowerCase()} units available</Text>}
            {searched && !loading && !error && matching.map((unit) => <TouchableOpacity key={unit.unitId} accessibilityRole="radio" accessibilityState={{ selected: unitId === unit.unitId, disabled: !unit.isAvailable }} disabled={!unit.isAvailable} style={[s.unit, unitId === unit.unitId && s.selected, !unit.isAvailable && s.disabled]} onPress={() => { setUnitId(unit.unitId); resetRequest(); }}><Text style={s.cardTitle}>{unit.unitId}</Text><Text style={unit.isAvailable ? s.ok : s.error}>{unit.isAvailable ? 'Available' : 'Unavailable for these dates'}</Text></TouchableOpacity>)}
          </>}
        </>}

        {quote && <View style={s.summary}>
          <Text style={s.summaryKicker}>ESTIMATED PRICE · NOT A RESERVATION</Text><Text style={s.summaryTitle}>Your stay at a glance</Text>
          <Text style={s.summarySub}>{stayType}{unitId ? ` · ${unitId}` : ''} · {date.nights} nights · {guests} guests</Text>
          <Text style={s.summarySub}>{arrival} → {departure}{choice === 'rv-site' && service ? ` · ${service}` : ''}</Text>
          {quote.weeklyBlocks > 0 && <PriceRow label={`${quote.weeklyBlocks} × complete 7-night Deluxe block`} value={quote.weeklyBlockTotal} />}
          {quote.remainingNights > 0 && <PriceRow label={`${quote.remainingNights} × $${quote.nightlyRate} night`} value={quote.remainingNightlyTotal} />}
          {quote.atvTotal > 0 && <PriceRow label="ATV / SxS · per stay" value={quote.atvTotal} />}
          <View style={s.total}><Text style={s.totalText}>Estimated total</Text><Text style={s.totalAmount}>${quote.total}</Text></View>
          <Text style={s.disclaimer}>This base estimate includes lodging and selected ATV access only. Extra adult, child or vehicle fees for tent stays, special events and holiday rates require staff confirmation. {CUSTOMER_REQUEST_SUBMISSION_ENABLED ? 'A request does not hold a site, guarantee a reservation or charge you.' : 'This preview does not save a request, hold a site or charge you.'}</Text>
          {CUSTOMER_REQUEST_SUBMISSION_ENABLED ? <>
            <Text style={[s.label, { marginTop: 18 }]}>YOUR NAME</Text>
            <TextInput accessibilityLabel="Your name" autoComplete="name" style={s.input} value={guestName} maxLength={200} onChangeText={(value) => { setGuestName(value); resetRequest(); }} />
            <Text style={[s.label, { marginTop: 12 }]}>EMAIL OR PHONE (AT LEAST ONE)</Text>
            <TextInput accessibilityLabel="Email address" autoComplete="email" keyboardType="email-address" autoCapitalize="none" style={s.input} value={email} maxLength={254} onChangeText={(value) => { setEmail(value); resetRequest(); }} />
            <TextInput accessibilityLabel="Phone number" autoComplete="tel" keyboardType="phone-pad" style={[s.input, { marginTop: 8 }]} value={phone} maxLength={30} onChangeText={(value) => { setPhone(value); resetRequest(); }} />
            <Text style={[s.label, { marginTop: 12 }]}>NOTE (OPTIONAL)</Text>
            <TextInput accessibilityLabel="Note for staff" multiline style={s.input} value={note} maxLength={1000} onChangeText={(value) => { setNote(value); resetRequest(); }} />
            <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: !canPreview || submitting }} style={[s.button, (!canPreview || submitting) && s.disabled]} disabled={!canPreview || submitting} onPress={() => void submitRequest()}><Text style={s.buttonText}>{submitting ? 'Sending request…' : 'Send booking request'}</Text></TouchableOpacity>
            {submitting && <ActivityIndicator color="#D8C59D" />}
            {submitError && <Notice title="Request not sent" message={validationMessage ?? BOOKING_REQUEST_ERROR_TEXT[submitError]} />}
          </> : <>
            <TouchableOpacity style={[s.button, !canPreview && s.disabled]} disabled={!canPreview} onPress={() => setPreview(true)}><Text style={s.buttonText}>Preview request · not sent</Text></TouchableOpacity>
            {preview && canPreview && <Notice title="Contact the ranch to request this stay" message={`Nothing has been submitted or saved. Call ${RANCH_CONFIG.ranch.phone} with these dates and site; staff will confirm current availability and pricing.`} />}
          </>}
        </View>}
        <TouchableOpacity accessibilityRole="link" accessibilityLabel={`Call White Oak Ranch at ${RANCH_CONFIG.ranch.phone}`} style={s.contact} onPress={() => void Linking.openURL(`tel:${RANCH_CONFIG.ranch.phone.replace(/\D/g, '')}`).catch(() => {})}>
          <Text style={s.contactText}>Questions or trouble checking dates? Call {RANCH_CONFIG.ranch.phone}</Text>
        </TouchableOpacity>
        <Text style={s.footer}>WHITE OAK RANCH · TENNESSEE RESORT & CAMPGROUND</Text>
      </View>
    </ScrollView>
  </SafeAreaView>;
}

function Notice({ title, message }: { title: string; message: string }) {
  return <View accessibilityLiveRegion="polite" style={s.notice}><Text style={s.noticeTitle}>{title}</Text><Text style={s.noticeText}>{message}</Text></View>;
}
function PriceRow({ label, value }: { label: string; value: number }) {
  return <View style={s.priceRow}><Text style={s.priceLabel}>{label}</Text><Text style={s.priceValue}>${value}</Text></View>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F1E8' }, page: { paddingBottom: 50 },
  hero: { backgroundColor: '#203B2A', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 34 },
  back: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#365340', alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  backText: { color: '#FFFFFF', fontSize: 30, lineHeight: 34 },
  eyebrow: { color: '#D8C59D', fontSize: 11, letterSpacing: 2, fontWeight: '800' },
  title: { color: '#FFFFFF', fontSize: 38, fontWeight: '800', marginTop: 8 },
  heroText: { color: '#DFE5DD', fontSize: 16, lineHeight: 24, marginTop: 8, maxWidth: 520 },
  pill: { alignSelf: 'flex-start', backgroundColor: '#D8C59D', color: '#203B2A', borderRadius: 20, paddingHorizontal: 13, paddingVertical: 7, marginTop: 22, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 18 },
  kicker: { color: '#9B7952', fontSize: 11, letterSpacing: 1.8, fontWeight: '900', marginTop: 30 },
  heading: { color: '#203B2A', fontSize: 25, fontWeight: '800', marginTop: 5, marginBottom: 14 },
  dates: { flexDirection: 'row', gap: 10 }, dateField: { flex: 1 },
  label: { color: '#526455', fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 7 },
  input: { backgroundColor: '#FFFFFF', borderColor: '#DDD9CE', borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16, color: '#203B2A' },
  error: { color: '#9E3E37', fontSize: 12, marginTop: 8, fontWeight: '700' },
  hint: { color: '#667167', fontSize: 12, lineHeight: 18, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 15, borderWidth: 2, borderColor: '#FFFFFF', padding: 15, flexGrow: 1, flexBasis: 220, minWidth: 155 },
  selected: { borderColor: '#9B7952' }, cardTitle: { color: '#203B2A', fontSize: 16, fontWeight: '800' },
  muted: { color: '#67736A', fontSize: 12, lineHeight: 18, marginTop: 5 },
  rate: { color: '#9B7952', fontSize: 13, fontWeight: '800', marginTop: 8 },
  services: { marginTop: 20 }, service: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 2, borderColor: '#FFFFFF', padding: 14, marginTop: 8 },
  guestRow: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 15, marginTop: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 }, stepButton: { backgroundColor: '#E9EEE7', width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: '#203B2A', fontSize: 22, lineHeight: 26 }, guestNumber: { color: '#203B2A', fontSize: 18, fontWeight: '800' },
  button: { backgroundColor: '#D8C59D', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 13 },
  disabled: { opacity: 0.48 }, buttonText: { color: '#203B2A', fontSize: 15, fontWeight: '900' },
  notice: { backgroundColor: '#FFF8E8', borderColor: '#E7DAB5', borderWidth: 1, borderRadius: 14, padding: 17, marginTop: 10 },
  noticeTitle: { color: '#4D4231', fontSize: 15, fontWeight: '800' }, noticeText: { color: '#5F5C54', fontSize: 13, lineHeight: 20, marginTop: 6 },
  loading: { alignItems: 'center', gap: 8, padding: 16 },
  unit: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 2, borderColor: '#FFFFFF', padding: 14, marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' },
  ok: { color: '#33704A', fontWeight: '800', fontSize: 12 },
  summary: { backgroundColor: '#203B2A', borderRadius: 17, padding: 20, marginTop: 26 },
  summaryKicker: { color: '#D8C59D', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  summaryTitle: { color: '#FFFFFF', fontSize: 23, fontWeight: '800', marginTop: 8 }, summarySub: { color: '#D6DDD7', fontSize: 13, marginTop: 5 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 13, gap: 10 }, priceLabel: { color: '#D6DDD7', fontSize: 13, flex: 1 }, priceValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  total: { borderTopWidth: 1, borderTopColor: '#63766A', flexDirection: 'row', justifyContent: 'space-between', marginTop: 17, paddingTop: 15 },
  totalText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' }, totalAmount: { color: '#D8C59D', fontSize: 23, fontWeight: '900' },
  disclaimer: { color: '#CCD8CC', fontSize: 11, lineHeight: 17, marginTop: 15 },
  contact: { backgroundColor: '#E7EDE3', borderRadius: 12, padding: 14, marginTop: 26, alignItems: 'center' },
  contactText: { color: '#203B2A', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  footer: { color: '#78877C', fontSize: 10, fontWeight: '900', letterSpacing: 1.4, textAlign: 'center', marginTop: 36 },
});
