import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  formatDateKey,
  isValidStayRange,
  parseDateInput,
} from '../data/reservationdata';
import { calculateStayPricing, RANCH_CONFIG } from '../data/ranchConfig';
import { canSaveLiveReservationPricing } from '../data/liveReservationPricing';
import { listStaffInventory, type RanchUnit } from '../repositories/inventory-repository';
import {
  checkStaffUnitAvailability,
  createStaffReservation,
  type ReservationRepositoryError,
  type ReservationWriteError,
} from '../repositories/reservation-repository';
import {
  LIVE_RESERVATION_WRITES_ENABLED,
  LIVE_WEEKLY_RESERVATION_PRICING_ENABLED,
} from '../constants/feature-flags';
import { formatDateInput, formatPhoneInput } from '../utils/formatters';

type StayType =
  | 'Tent Site'
  | 'RV Site'
  | 'Small Rental RV'
  | 'Large Rental RV';

type RVService = 'Parking Only' | 'Electric + Water' | 'Deluxe';
type AvailabilityState = 'checking' | 'available' | 'unavailable' | 'error';

const STAY_TYPES: StayType[] = [
  'Tent Site',
  'RV Site',
  'Small Rental RV',
  'Large Rental RV',
];

const RV_SERVICES: RVService[] = [
  'Parking Only',
  'Electric + Water',
  'Deluxe',
];

function errorMessage(error: ReservationRepositoryError | ReservationWriteError) {
  if (error === 'permission') return 'Your staff account is not allowed to do this.';
  if (error === 'conflict') return 'That unit was booked for those dates. Choose another unit.';
  if (error === 'pricing_unavailable') return 'This weekly price cannot be saved to the live database yet.';
  if (error === 'validation') return 'The reservation does not match the ranch rules.';
  return 'The live reservation service is unavailable. Try again.';
}

export default function StaffNewReservationScreen() {
  const [guestName, setGuestName] = useState('');
  const [phone, setPhone] = useState('');
  const [arrival, setArrival] = useState('');
  const [departure, setDeparture] = useState('');
  const [guests, setGuests] = useState(2);
  const [stayType, setStayType] = useState<StayType>('Tent Site');
  const [rvService, setRvService] = useState<RVService>('Deluxe');
  const [atvAccess, setAtvAccess] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [units, setUnits] = useState<RanchUnit[]>([]);
  const [isLoadingUnits, setIsLoadingUnits] = useState(true);
  const [unitError, setUnitError] = useState<ReservationRepositoryError | null>(null);
  const [availability, setAvailability] = useState<AvailabilityState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadUnits = useCallback(async () => {
    setIsLoadingUnits(true);
    setUnitError(null);
    const result = await listStaffInventory();
    setUnits(result.units);
    setUnitError(result.error);
    setIsLoadingUnits(false);
  }, []);

  useEffect(() => {
    void loadUnits();
  }, [loadUnits]);

  const validDateRange = isValidStayRange(arrival, departure);
  const nights = useMemo(() => {
    const start = parseDateInput(arrival);
    const end = parseDateInput(departure);
    if (!start || !end || end <= start) return 0;
    return Math.round((Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) -
      Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) /
      (1000 * 60 * 60 * 24));
  }, [arrival, departure]);

  const pricing = useMemo(() => calculateStayPricing({
    stayType,
    rvService,
    nights,
    atvAccess,
  }), [atvAccess, nights, rvService, stayType]);
  const livePricingAvailable = canSaveLiveReservationPricing(
    pricing,
    stayType === 'RV Site' ? rvService : undefined,
    LIVE_WEEKLY_RESERVATION_PRICING_ENABLED
  );

  const visibleUnits = units.filter((unit) => unit.stayType === stayType);
  const maxGuests = stayType === 'Tent Site'
    ? 6
    : stayType === 'Small Rental RV'
      ? 5
      : stayType === 'Large Rental RV'
        ? 8
        : undefined;

  useEffect(() => {
    if (!selectedUnit || !validDateRange) {
      setAvailability(null);
      return;
    }

    const start = parseDateInput(arrival);
    const end = parseDateInput(departure);
    if (!start || !end) return;

    let active = true;
    setAvailability('checking');
    void checkStaffUnitAvailability(
      selectedUnit,
      stayType,
      formatDateKey(start),
      formatDateKey(end)
    ).then((result) => {
      if (!active) return;
      setAvailability(result.error ? 'error' : result.available ? 'available' : 'unavailable');
    });

    return () => {
      active = false;
    };
  }, [arrival, departure, selectedUnit, stayType, validDateRange]);

  function selectStayType(nextStayType: StayType) {
    setStayType(nextStayType);
    setSelectedUnit(null);
    setAvailability(null);
  }

  function changeGuests(amount: number) {
    setGuests((current) => Math.max(1, current + amount));
  }

  async function saveReservation() {
    setFormError(null);
    setSuccessMessage(null);

    if (!LIVE_RESERVATION_WRITES_ENABLED) {
      setFormError('Live reservation creation is currently disabled.');
      return;
    }
    if (!livePricingAvailable) {
      setFormError('This weekly price cannot be saved to the live database yet. No reservation was submitted.');
      return;
    }
    if (!guestName.trim()) return setFormError('Enter the primary guest name.');
    if (!selectedUnit) return setFormError('Select a ranch unit.');
    if (!validDateRange) return setFormError('Enter a valid arrival and departure range.');
    if (maxGuests && guests > maxGuests) {
      return setFormError(`This unit type allows no more than ${maxGuests} guests.`);
    }
    if (stayType === 'RV Site' && !rvService) {
      return setFormError('Select an RV service level.');
    }
    if (availability !== 'available') {
      return setFormError(
        availability === 'unavailable'
          ? 'That unit is unavailable for the selected dates.'
          : 'Wait for live availability to finish checking.'
      );
    }

    const start = parseDateInput(arrival);
    const end = parseDateInput(departure);
    if (!start || !end) return setFormError('Enter valid dates.');

    setIsSaving(true);
    const result = await createStaffReservation({
      guestName,
      phone,
      unit: selectedUnit,
      stayType,
      rvService: stayType === 'RV Site' ? rvService : undefined,
      arrival: formatDateKey(start),
      departure: formatDateKey(end),
      guests,
      atvAccess,
      nightlyRate: pricing.nightlyRate,
      nights,
      total: pricing.total,
    });
    setIsSaving(false);

    if (result.error || !result.reservation) {
      setFormError(errorMessage(result.error ?? 'unavailable'));
      return;
    }

    setSuccessMessage(
      `Reservation created for ${result.reservation.guestName}. The live staff list will refresh when you return.`
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>WHITE OAK RANCH</Text>
            <Text style={styles.title}>Create Live Reservation</Text>
            <Text style={styles.subtitle}>Staff-only Supabase write</Text>
          </View>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeLabel}>LIVE STAFF CREATION</Text>
          <Text style={styles.noticeText}>
            Availability is checked against live reservations before saving. The database also enforces the final overlap check.
          </Text>
        </View>

        <Section title="Guest information">
          <Text style={styles.label}>PRIMARY GUEST</Text>
          <TextInput value={guestName} onChangeText={setGuestName} placeholder="Guest name" placeholderTextColor="#999D97" style={styles.input} />
          <Text style={styles.label}>PHONE (OPTIONAL)</Text>
          <TextInput value={phone} onChangeText={(value) => setPhone(formatPhoneInput(value))} placeholder="Phone number" placeholderTextColor="#999D97" keyboardType="phone-pad" style={styles.input} />
        </Section>

        <Section title="Stay dates">
          <View style={styles.dateRow}>
            <View style={styles.dateColumn}>
              <Text style={styles.label}>ARRIVAL</Text>
              <TextInput value={arrival} onChangeText={(value) => setArrival(formatDateInput(value))} placeholder="MM/DD/YYYY" placeholderTextColor="#999D97" style={styles.input} />
            </View>
            <View style={styles.dateColumn}>
              <Text style={styles.label}>DEPARTURE</Text>
              <TextInput value={departure} onChangeText={(value) => setDeparture(formatDateInput(value))} placeholder="MM/DD/YYYY" placeholderTextColor="#999D97" style={styles.input} />
            </View>
          </View>
          <Text style={styles.helperText}>
            {validDateRange ? `${nights} night${nights === 1 ? '' : 's'}` : 'Departure must be after arrival.'}
          </Text>
        </Section>

        <Section title="Stay type">
          {STAY_TYPES.map((option) => (
            <ChoiceButton key={option} label={option} selected={stayType === option} onPress={() => selectStayType(option)} />
          ))}
          {stayType === 'RV Site' && (
            <>
              <Text style={styles.label}>RV SERVICE</Text>
              {RV_SERVICES.map((option) => (
                <ChoiceButton key={option} label={`${option} • $${calculateStayPricing({ stayType: 'RV Site', rvService: option, nights: 1 }).nightlyRate}/night`} selected={rvService === option} onPress={() => setRvService(option)} />
              ))}
            </>
          )}
        </Section>

        <Section title="Live unit availability">
          {isLoadingUnits ? <ActivityIndicator color="#203B2A" /> : unitError ? (
            <StateMessage text={errorMessage(unitError)} onRetry={() => void loadUnits()} />
          ) : visibleUnits.length === 0 ? (
            <StateMessage text="No live units match this stay type." />
          ) : (
            <View style={styles.unitGrid}>
              {visibleUnits.map((unit) => (
                <TouchableOpacity key={`${unit.id}-${unit.stayType}`} onPress={() => setSelectedUnit(unit.id)} style={[styles.unitButton, selectedUnit === unit.id && styles.unitButtonSelected]}>
                  <Text style={[styles.unitText, selectedUnit === unit.id && styles.unitTextSelected]}>{unit.id}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {availability && (
            <Text style={availability === 'available' ? styles.availableText : styles.unavailableText}>
              {availability === 'checking' && 'Checking live availability...'}
              {availability === 'available' && 'Available for these dates.'}
              {availability === 'unavailable' && 'Unavailable for these dates.'}
              {availability === 'error' && 'Availability could not be verified.'}
            </Text>
          )}
        </Section>

        <Section title="Guests & access">
          <View style={styles.guestRow}>
            <Text style={styles.guestLabel}>Total guests</Text>
            <View style={styles.stepper}>
              <TouchableOpacity onPress={() => changeGuests(-1)} style={styles.stepButton}><Text style={styles.stepText}>−</Text></TouchableOpacity>
              <Text style={styles.guestCount}>{guests}</Text>
              <TouchableOpacity onPress={() => changeGuests(1)} style={styles.stepButton}><Text style={styles.stepText}>+</Text></TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity onPress={() => setAtvAccess((current) => !current)} style={styles.choiceButton}>
            <Text style={styles.choiceText}>Overnight ATV / SxS access</Text>
            <Text style={styles.choiceState}>{atvAccess ? 'YES' : 'NO'}</Text>
          </TouchableOpacity>
        </Section>

        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>PRICING SUMMARY</Text>
          {pricing.weeklyBlocks > 0 && <Text style={styles.summaryLine}>{pricing.weeklyBlocks} × 7-night block @ ${pricing.weeklyBlockRate}: ${pricing.weeklyBlockTotal}</Text>}
          {pricing.remainingNights > 0 && <Text style={styles.summaryLine}>{pricing.remainingNights} night{pricing.remainingNights === 1 ? '' : 's'} @ ${pricing.nightlyRate}: ${pricing.remainingNightlyTotal}</Text>}
          {atvAccess && <Text style={styles.summaryLine}>Overnight ATV / SxS: ${pricing.atvTotal}</Text>}
          {!livePricingAvailable && <Text style={styles.warningText}>Only Deluxe/full-hookup weekly totals can be saved live. This service's weekly quote remains demo-only.</Text>}
          <Text style={styles.total}>Total ${pricing.total}</Text>
        </View>

        {formError && <StateMessage text={formError} />}
        {successMessage && (
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>Saved to Supabase</Text>
            <Text style={styles.successText}>{successMessage}</Text>
            <TouchableOpacity onPress={() => router.replace('/manage-reservations')} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>BACK TO LIVE RESERVATIONS</Text>
            </TouchableOpacity>
          </View>
        )}

        {!successMessage && (
          <TouchableOpacity disabled={isSaving} onPress={() => void saveReservation()} style={[styles.primaryButton, isSaving && styles.disabledButton]}>
            {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>CREATE LIVE RESERVATION</Text>}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

function ChoiceButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <TouchableOpacity onPress={onPress} style={[styles.choiceButton, selected && styles.choiceButtonSelected]}><Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>{selected && <Text style={styles.choiceState}>SELECTED</Text>}</TouchableOpacity>;
}

function StateMessage({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return <View style={styles.stateCard}><Text style={styles.stateText}>{text}</Text>{onRetry && <TouchableOpacity onPress={onRetry}><Text style={styles.retryText}>TRY AGAIN</Text></TouchableOpacity>}</View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F1E8' },
  container: { paddingBottom: 50 },
  header: { alignItems: 'center', backgroundColor: '#203B2A', flexDirection: 'row', padding: 20 },
  backButton: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 22, height: 44, justifyContent: 'center', marginRight: 15, width: 44 },
  backText: { color: '#FFFFFF', fontSize: 36, lineHeight: 38 },
  headerCopy: { flex: 1 },
  eyebrow: { color: '#D8C59D', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: '#FFFFFF', fontSize: 26, fontWeight: '900', marginTop: 4 },
  subtitle: { color: '#D6DDD7', fontSize: 13, marginTop: 4 },
  notice: { backgroundColor: '#D8C59D', borderRadius: 16, margin: 18, padding: 17 },
  noticeLabel: { color: '#526056', fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  noticeText: { color: '#526056', fontSize: 12, lineHeight: 18, marginTop: 5 },
  section: { backgroundColor: '#FFFFFF', borderRadius: 16, marginHorizontal: 18, marginBottom: 12, padding: 17 },
  sectionTitle: { color: '#203B2A', fontSize: 18, fontWeight: '900', marginBottom: 13 },
  label: { color: '#9B8A68', fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginTop: 8, marginBottom: 6 },
  input: { backgroundColor: '#F4F1E8', borderRadius: 10, color: '#203B2A', fontSize: 14, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 6 },
  dateRow: { flexDirection: 'row', gap: 10 },
  dateColumn: { flex: 1 },
  helperText: { color: '#747873', fontSize: 12, marginTop: 4 },
  choiceButton: { alignItems: 'center', borderColor: '#E4E1D8', borderRadius: 10, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, padding: 13 },
  choiceButtonSelected: { backgroundColor: '#E2EDE4', borderColor: '#9EB8A4' },
  choiceText: { color: '#526056', fontSize: 13, fontWeight: '700' },
  choiceTextSelected: { color: '#203B2A' },
  choiceState: { color: '#31523A', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  unitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  unitButton: { backgroundColor: '#F4F1E8', borderRadius: 10, padding: 12, width: '31%' },
  unitButtonSelected: { backgroundColor: '#203B2A' },
  unitText: { color: '#203B2A', fontSize: 12, fontWeight: '800', textAlign: 'center' },
  unitTextSelected: { color: '#FFFFFF' },
  availableText: { color: '#39704A', fontSize: 12, fontWeight: '800', marginTop: 10 },
  unavailableText: { color: '#A14F3C', fontSize: 12, fontWeight: '800', marginTop: 10 },
  guestRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  guestLabel: { color: '#526056', fontSize: 14, fontWeight: '700' },
  stepper: { alignItems: 'center', flexDirection: 'row', gap: 14 },
  stepButton: { alignItems: 'center', backgroundColor: '#E2EDE4', borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  stepText: { color: '#203B2A', fontSize: 22 },
  guestCount: { color: '#203B2A', fontSize: 18, fontWeight: '900' },
  summary: { backgroundColor: '#EAE6DA', borderRadius: 16, marginHorizontal: 18, marginBottom: 12, padding: 18 },
  summaryLabel: { color: '#9B7952', fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  summaryLine: { color: '#526056', fontSize: 13, marginTop: 7 },
  warningText: { color: '#8A5A24', fontSize: 12, lineHeight: 17, marginTop: 8 },
  total: { color: '#203B2A', fontSize: 22, fontWeight: '900', marginTop: 12 },
  stateCard: { backgroundColor: '#FFFFFF', borderRadius: 14, marginBottom: 12, padding: 15 },
  stateText: { color: '#7A4B3E', fontSize: 13, lineHeight: 19 },
  retryText: { color: '#203B2A', fontSize: 11, fontWeight: '900', marginTop: 10 },
  successCard: { backgroundColor: '#E2EDE4', borderRadius: 16, marginHorizontal: 18, marginBottom: 12, padding: 18 },
  successTitle: { color: '#31523A', fontSize: 17, fontWeight: '900' },
  successText: { color: '#526056', fontSize: 13, lineHeight: 19, marginTop: 5 },
  primaryButton: { alignItems: 'center', backgroundColor: '#203B2A', borderRadius: 14, marginHorizontal: 18, paddingVertical: 16 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  disabledButton: { opacity: 0.6 },
});
