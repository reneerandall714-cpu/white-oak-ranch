import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { calculateNights, formatDateKey, isValidStayRange, parseDateInput, type ReservationRecord } from '../data/reservationdata';
import { calculateLiveStayPricing } from '../data/liveReservationPricing';
import type { RVServiceName } from '../data/ranchConfig';
import { formatDateInput, formatPhoneInput } from '../utils/formatters';
import { listStaffInventory, type RanchUnit } from '../repositories/inventory-repository';
import { canManageReservation } from '../repositories/reservation-request';
import {
  cancelStaffReservation, checkStaffUnitAvailability, getStaffReservation, updateStaffReservation,
  type ReservationRepositoryError, type ReservationWriteError, type StaffReservationDraft,
} from '../repositories/reservation-repository';

type Draft = {
  guestName: string; phone: string; arrival: string; departure: string;
  unit: string; guests: number; rvService: RVServiceName; atvAccess: boolean;
};
type Availability = 'checking' | 'available' | 'unavailable' | 'error' | null;
const RV_SERVICES: RVServiceName[] = ['Parking Only', 'Electric + Water', 'Deluxe'];

function displayDate(value: string) {
  const [year, month, day] = value.split('-');
  return `${month}/${day}/${year}`;
}

function draftFromReservation(value: ReservationRecord): Draft {
  return {
    guestName: value.guestName,
    phone: value.phone ?? '',
    arrival: displayDate(value.arrival),
    departure: displayDate(value.departure),
    unit: value.unit,
    guests: value.guests ?? 1,
    rvService: RV_SERVICES.find((service) => service === value.rvService) ?? 'Deluxe',
    atvAccess: value.atvAccess ?? false,
  };
}

function errorMessage(error: ReservationRepositoryError | ReservationWriteError) {
  if (error === 'session_expired') return 'Your staff session expired. Sign in again before managing reservations.';
  if (error === 'permission') return 'Your staff account cannot change this reservation.';
  if (error === 'connectivity') return 'Connection lost. Refresh the live reservation before retrying; the request may have completed.';
  if (error === 'conflict') return 'That unit is booked for the selected dates. Choose another unit or dates.';
  if (error === 'unit_unavailable') return 'That unit is no longer available for this stay type. Refresh and choose another.';
  if (error === 'stale') return 'This reservation changed since you opened it. Refresh before trying again.';
  if (error === 'pricing_unavailable') return 'This weekly price cannot be saved live.';
  if (error === 'invalid_draft') return 'Review the guest, dates, unit, and price before saving.';
  if (error === 'validation') return 'The database rejected the change under the ranch booking rules.';
  return 'The live service could not confirm the change. Refresh before retrying.';
}

export default function StaffReservationDetailScreen() {
  const params = useLocalSearchParams<{ id?: string; intent?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const [reservation, setReservation] = useState<ReservationRecord | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [units, setUnits] = useState<RanchUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(params.intent === 'cancel');
  const [availability, setAvailability] = useState<Availability>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const load = useCallback(async () => {
    if (!id) { setError('Reservation ID is missing.'); setLoading(false); return; }
    setLoading(true);
    setError(null);
    setReservation(null);
    setDraft(null);
    setEditing(false);
    try {
      const [detail, inventory] = await Promise.all([getStaffReservation(id), listStaffInventory()]);
      if (detail.error) setError(errorMessage(detail.error));
      else if (!detail.reservation) setError('Reservation not found or no longer visible.');
      else {
        setReservation(detail.reservation);
        setDraft(draftFromReservation(detail.reservation));
      }
      if (inventory.error) setError(errorMessage(inventory.error));
      else setUnits(inventory.units);
    } catch {
      setError('Live details could not be loaded. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const nights = draft ? calculateNights(draft.arrival, draft.departure) ?? 0 : 0;
  const pricing = useMemo(() => calculateLiveStayPricing({
    stayType: reservation?.stayType ?? '',
    rvService: reservation?.stayType === 'RV Site' ? draft?.rvService : undefined,
    nights,
    atvAccess: draft?.atvAccess,
  }), [reservation?.stayType, draft?.rvService, draft?.atvAccess, nights]);

  useEffect(() => {
    if (!draft || !reservation || !isValidStayRange(draft.arrival, draft.departure)) {
      setAvailability(null);
      return;
    }
    const arrival = parseDateInput(draft.arrival);
    const departure = parseDateInput(draft.departure);
    if (!arrival || !departure) return;
    let active = true;
    setAvailability('checking');
    void checkStaffUnitAvailability(
      draft.unit, reservation.stayType ?? '', formatDateKey(arrival), formatDateKey(departure), reservation.id
    ).then((result) => {
      if (active) setAvailability(result.error ? 'error' : result.available ? 'available' : 'unavailable');
    }).catch(() => { if (active) setAvailability('error'); });
    return () => { active = false; };
  }, [draft?.unit, draft?.arrival, draft?.departure, reservation?.id, reservation?.stayType]);

  const canManage = reservation ? canManageReservation(reservation.status) : false;
  const maxGuests = reservation?.stayType === 'Tent Site' ? 6 :
    reservation?.stayType === 'Small Rental RV' ? 5 :
      reservation?.stayType === 'Large Rental RV' ? 8 : undefined;
  const eligibleUnits = units.filter((unit) => unit.stayType === reservation?.stayType);

  async function saveEdit() {
    if (!reservation || !draft || savingRef.current) return;
    setError(null);
    setNotice(null);
    if (!draft.guestName.trim() || draft.guestName.trim().length > 200 || draft.phone.length > 40 ||
        !isValidStayRange(draft.arrival, draft.departure) || !eligibleUnits.some((unit) => unit.id === draft.unit) ||
        draft.guests < 1 || draft.guests > 32767 || (maxGuests !== undefined && draft.guests > maxGuests)) {
      setError('Review the guest, phone, dates, unit, and guest count before saving.');
      return;
    }
    if (availability !== 'available') {
      setError(availability === 'unavailable' ? 'That unit is booked for those dates.' : 'Wait for live availability to finish checking.');
      return;
    }
    const arrival = parseDateInput(draft.arrival);
    const departure = parseDateInput(draft.departure);
    if (!arrival || !departure || !nights) return;
    const update: StaffReservationDraft = {
      guestName: draft.guestName, phone: draft.phone, unit: draft.unit,
      stayType: reservation.stayType as StaffReservationDraft['stayType'],
      rvService: reservation.stayType === 'RV Site' ? draft.rvService : undefined,
      arrival: formatDateKey(arrival), departure: formatDateKey(departure),
      guests: draft.guests, atvAccess: draft.atvAccess,
      nightlyRate: pricing.nightlyRate, nights, total: pricing.total,
    };
    savingRef.current = true;
    setSaving(true);
    try {
      const result = await updateStaffReservation(reservation, update);
      if (result.error || !result.reservation) setError(errorMessage(result.error ?? 'unavailable'));
      else {
        setReservation(result.reservation);
        setDraft(draftFromReservation(result.reservation));
        setEditing(false);
        setNotice('Reservation saved. The live list will refresh when you return.');
      }
    } catch { setError('The save could not be confirmed. Refresh the live reservation before retrying.'); }
    finally { savingRef.current = false; setSaving(false); }
  }

  async function cancel() {
    if (!reservation || !canManage || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const result = await cancelStaffReservation(reservation);
      if (result.error || !result.reservation) setError(errorMessage(result.error ?? 'unavailable'));
      else {
        setReservation(result.reservation);
        setDraft(draftFromReservation(result.reservation));
        setConfirmCancel(false);
        setEditing(false);
        setNotice('Reservation cancelled. Its history is preserved in the live list.');
      }
    } catch { setError('Cancellation could not be confirmed. Refresh the live reservation before retrying.'); }
    finally { savingRef.current = false; setSaving(false); }
  }

  function changeDraft(change: Partial<Draft>) {
    setDraft((current) => current ? { ...current, ...change } : current);
    setNotice(null);
  }

  return <SafeAreaView style={styles.safeArea}>
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>‹ Back</Text></TouchableOpacity>
        <Text style={styles.title}>Live reservation</Text>
        <Text style={styles.subtle}>Staff-only detail and management</Text>
      </View>
      {loading ? <ActivityIndicator style={styles.space} color="#203B2A" /> : <>
        {error && <Text style={styles.error}>{error}</Text>}
        {notice && <Text style={styles.notice}>{notice}</Text>}
        {!reservation ? <Action label="Refresh" onPress={() => void load()} /> : <>
          <View style={styles.card}>
            <Text style={styles.status}>{reservation.status}</Text>
            <Text style={styles.heading}>{reservation.guestName}</Text>
            <Text style={styles.detail}>{reservation.stayType} • {reservation.unit}{reservation.rvService ? ` • ${reservation.rvService}` : ''}</Text>
            <Text style={styles.detail}>{reservation.arrival} to {reservation.departure} • {reservation.nights} nights</Text>
            <Text style={styles.detail}>{reservation.guests} guests • ATV access: {reservation.atvAccess ? 'Yes' : 'No'}</Text>
            <Text style={styles.detail}>Phone: {reservation.phone || 'Not provided'}</Text>
            <Text style={styles.heading}>${reservation.total}</Text>
          </View>
          {canManage && !editing && !confirmCancel && <View style={styles.actions}>
            <Action label="Edit reservation" onPress={() => setEditing(true)} />
            <Action label="Cancel reservation" onPress={() => setConfirmCancel(true)} secondary />
          </View>}
          {confirmCancel && canManage && <View style={styles.card}>
            <Text style={styles.heading}>Confirm cancellation</Text>
            <Text style={styles.detail}>This changes the status to CANCELLED and keeps the reservation record. It will release the unit for these dates.</Text>
            <Action label={saving ? 'Cancelling...' : 'Confirm cancellation'} onPress={() => void cancel()} disabled={saving} secondary />
            <Action label="Keep reservation" onPress={() => setConfirmCancel(false)} disabled={saving} />
          </View>}
          {editing && draft && canManage && <View style={styles.card}>
            <Text style={styles.heading}>Edit booking</Text>
            <Field label="Guest name" value={draft.guestName} onChangeText={(guestName) => changeDraft({ guestName })} />
            <Field label="Phone (optional)" value={draft.phone} onChangeText={(value) => changeDraft({ phone: formatPhoneInput(value) })} />
            <View style={styles.actions}>
              <View style={styles.column}><Field label="Arrival" value={draft.arrival} onChangeText={(value) => changeDraft({ arrival: formatDateInput(value) })} /></View>
              <View style={styles.column}><Field label="Departure" value={draft.departure} onChangeText={(value) => changeDraft({ departure: formatDateInput(value) })} /></View>
            </View>
            <Text style={styles.label}>Unit • {reservation.stayType}</Text>
            <View style={styles.choices}>{eligibleUnits.map((unit) => <Choice key={unit.id} label={unit.id} selected={draft.unit === unit.id} onPress={() => changeDraft({ unit: unit.id })} />)}</View>
            {reservation.stayType === 'RV Site' && <>
              <Text style={styles.label}>RV service</Text>
              <View style={styles.choices}>{RV_SERVICES.map((service) => <Choice key={service} label={service} selected={draft.rvService === service} onPress={() => changeDraft({ rvService: service })} />)}</View>
            </>}
            <Text style={styles.label}>Guests</Text>
            <View style={styles.actions}>
              <Action label="−" onPress={() => changeDraft({ guests: Math.max(1, draft.guests - 1) })} />
              <Text style={styles.detail}>{draft.guests}</Text>
              <Action label="+" onPress={() => changeDraft({ guests: draft.guests + 1 })} />
            </View>
            <Choice label={`Overnight ATV / SxS access: ${draft.atvAccess ? 'Yes' : 'No'}`} selected={draft.atvAccess} onPress={() => changeDraft({ atvAccess: !draft.atvAccess })} />
            <Text style={styles.detail}>Live availability: {availability ?? 'Enter valid dates'}</Text>
            <Text style={styles.heading}>Live price: ${pricing.total}</Text>
            {pricing.weeklyBlocks > 0 && <Text style={styles.detail}>{pricing.weeklyBlocks} × 7 nights at ${pricing.weeklyBlockRate}: ${pricing.weeklyBlockTotal}</Text>}
            {pricing.remainingNights > 0 && <Text style={styles.detail}>{pricing.remainingNights} nights at ${pricing.nightlyRate}: ${pricing.remainingNightlyTotal}</Text>}
            {pricing.atvTotal > 0 && <Text style={styles.detail}>ATV access: ${pricing.atvTotal}</Text>}
            {reservation.stayType === 'RV Site' && draft.rvService !== 'Deluxe' && nights >= 7 && <Text style={styles.detail}>Other RV weekly offers are demo-only; live reservations use the nightly rate for every night.</Text>}
            <Action label={saving ? 'Saving...' : 'Save live changes'} onPress={() => void saveEdit()} disabled={saving || availability !== 'available'} />
            <Action label="Discard changes" onPress={() => { setDraft(draftFromReservation(reservation)); setEditing(false); }} disabled={saving} secondary />
          </View>}
          <Action label="Refresh live details" onPress={() => void load()} disabled={saving} secondary />
        </>}
      </>}
    </ScrollView>
  </SafeAreaView>;
}

function Field({ label, value, onChangeText }: { label: string; value: string; onChangeText: (value: string) => void }) {
  return <View style={styles.space}><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} style={styles.input} placeholder={label} /></View>;
}
function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <TouchableOpacity onPress={onPress} style={[styles.choice, selected && styles.selected]}><Text style={styles.detail}>{label}</Text></TouchableOpacity>;
}
function Action({ label, onPress, disabled, secondary }: { label: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  return <TouchableOpacity onPress={onPress} disabled={disabled} style={[styles.button, secondary && styles.secondary, disabled && styles.disabled]}><Text style={[styles.buttonText, secondary && styles.secondaryText]}>{label}</Text></TouchableOpacity>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F1E8' },
  container: { paddingBottom: 48 },
  header: { backgroundColor: '#203B2A', padding: 20 },
  back: { color: '#FFFFFF', fontWeight: '800', marginBottom: 10 },
  title: { color: '#FFFFFF', fontSize: 26, fontWeight: '900' },
  subtle: { color: '#D6DDD7', marginTop: 4 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, margin: 16 },
  heading: { color: '#203B2A', fontSize: 19, fontWeight: '900', marginBottom: 8 },
  status: { color: '#31523A', fontWeight: '900', marginBottom: 10 },
  detail: { color: '#526056', fontSize: 13, lineHeight: 19, marginBottom: 5 },
  label: { color: '#806B4C', fontSize: 12, fontWeight: '800', marginBottom: 5 },
  input: { backgroundColor: '#F4F1E8', borderRadius: 10, padding: 12, color: '#203B2A' },
  space: { margin: 12 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 8 },
  column: { flex: 1, minWidth: 120 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  choice: { borderWidth: 1, borderColor: '#D5D0C4', borderRadius: 9, padding: 10 },
  selected: { backgroundColor: '#DCEBDD', borderColor: '#31523A' },
  button: { backgroundColor: '#203B2A', borderRadius: 10, padding: 12, marginTop: 8, marginRight: 8 },
  secondary: { backgroundColor: '#F4F1E8', borderWidth: 1, borderColor: '#9F5A4D' },
  buttonText: { color: '#FFFFFF', fontWeight: '800' },
  secondaryText: { color: '#9F5A4D' },
  disabled: { opacity: 0.5 },
  error: { backgroundColor: '#F8E6E1', color: '#883B2F', margin: 16, padding: 14, borderRadius: 10 },
  notice: { backgroundColor: '#DCEBDD', color: '#31523A', margin: 16, padding: 14, borderRadius: 10 },
});
