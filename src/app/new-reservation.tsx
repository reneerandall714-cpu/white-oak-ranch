import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  RANCH_CONFIG,
  RV_SITE_NUMBERS,
  TENT_SITE_NUMBERS,
} from '../data/ranchConfig';

import {
  addReservation,
  calculateNights,
  getUnavailableUnits,
  isValidStayRange
} from '../data/reservationdata';

import {
  formatDateInput,
  formatPhoneInput,
} from '../utils/formatters';

type StayType =
  | 'Tent Site'
  | 'RV Site'
  | 'Small Rental RV'
  | 'Large Rental RV';

type RVService =
  | 'Parking Only'
  | 'Electric + Water'
  | 'Deluxe';

const RV_PRICES: Record<RVService, number> = {
  'Parking Only': RANCH_CONFIG.pricing.rv.parkingOnly.nightly,
  'Electric + Water': RANCH_CONFIG.pricing.rv.electricWater.nightly,
  Deluxe: RANCH_CONFIG.pricing.rv.deluxe.nightly,
};
  
export default function NewReservationScreen() {
  const [guestName, setGuestName] = useState('');
  const [phone, setPhone] = useState('');
  const [arrival, setArrival] = useState('');
  const [departure, setDeparture] = useState('');
  const [guests, setGuests] = useState(2);

  const [stayType, setStayType] =
    useState<StayType>('Tent Site');

  const [rvService, setRVService] =
    useState<RVService>('Deluxe');

  const [atvAccess, setAtvAccess] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
const validDateRange = isValidStayRange(arrival, departure);

const unavailableUnits = useMemo(
  () => getUnavailableUnits(arrival, departure),
  [arrival, departure]
);
const calculatedNights = calculateNights(arrival, departure);
 const nightlyRate = useMemo(() => {
  if (stayType === 'Tent Site') {
    return RANCH_CONFIG.pricing.tent.nightly;
  }

  if (stayType === 'RV Site') {
    return RV_PRICES[rvService];
  }

  if (stayType === 'Small Rental RV') {
    return RANCH_CONFIG.pricing.rentalRV.small.normal;
  }

  return RANCH_CONFIG.pricing.rentalRV.large.normal;
}, [stayType, rvService]);

const lodgingTotal = nightlyRate * (calculatedNights ?? 0);

const atvTotal = atvAccess
  ? RANCH_CONFIG.pricing.overnightAtvSxs
  : 0;

const total = lodgingTotal + atvTotal;

  function changeGuests(amount: number) {
    setGuests((current) => Math.max(1, current + amount));
  }

  function saveReservation() {
    if (!guestName.trim()) {
      Alert.alert(
        'Guest Name Required',
        'Enter the primary guest name before creating the reservation.'
      );
      return;
    }
if (!selectedUnit) {
  Alert.alert(
    'Site Required',
    'Select a site or rental unit before creating the reservation.'
  );
  return;
}
    if (!arrival.trim() || !departure.trim()) {
      Alert.alert(
        'Dates Required',
        'Enter the arrival and departure dates.'
      );
      return;
    }

if (
  stayType === 'Tent Site' &&
  guests > RANCH_CONFIG.pricing.tent.maxGuestsPerSite
) {
      Alert.alert(
        'Additional Campsite Needed',
        'Tent camping allows up to 6 guests per campsite. This group will require an additional campsite.'
      );
      return;
    }
addReservation({
  guestName: guestName.trim(),
  phone: phone.trim(),
  unit: selectedUnit!,
  stayType,
  rvService: stayType === 'RV Site' ? rvService : undefined,
  arrival,
  departure,
  guests,
  atvAccess,
  nightlyRate,
  nights: calculatedNights ?? 0,
  total,
  status: 'CONFIRMED',
});

    Alert.alert(
      'Reservation Created',
      `${guestName}\n${stayType}\n${selectedUnit}\n${calculatedNights} night${
  calculatedNights === 1 ? '' : 's'
}\nTotal: $${total}`,
      [
        {
          text: 'Stay Here',
          style: 'cancel',
        },
        {
          text: 'Back to Reservations',
          onPress: () => router.back(),
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>WHITE OAK RANCH</Text>
            <Text style={styles.title}>New Reservation</Text>
            <Text style={styles.subtitle}>
              Create a guest stay
            </Text>
          </View>
        </View>

        <Section title="Guest Information">
          <Text style={styles.inputLabel}>PRIMARY GUEST</Text>

          <TextInput
            style={styles.input}
            value={guestName}
            onChangeText={setGuestName}
            placeholder="Guest name"
            placeholderTextColor="#999D97"
          />

          <Text style={styles.inputLabel}>PHONE</Text>

          <TextInput
            style={styles.input}
            value={phone}
           onChangeText={(text) => setPhone(formatPhoneInput(text))}
            placeholder="Phone number"
            placeholderTextColor="#999D97"
            keyboardType="phone-pad"
          />
        </Section>

        <Section title="Stay Dates">
          <View style={styles.dateRow}>
            <View style={styles.dateColumn}>
              <Text style={styles.inputLabel}>ARRIVAL</Text>

              <TextInput
                style={styles.input}
                value={arrival}
                onChangeText={(text) => setArrival(formatDateInput(text))}
                placeholder="MM/DD/YYYY"
                placeholderTextColor="#999D97"
              />
            </View>

            <View style={styles.dateSpacer} />

            <View style={styles.dateColumn}>
              <Text style={styles.inputLabel}>DEPARTURE</Text>

              <TextInput
                style={styles.input}
                value={departure}
                onChangeText={(text) => setDeparture(formatDateInput(text))}
                placeholder="MM/DD/YYYY"
                placeholderTextColor="#999D97"
              />
            </View>
          </View>

         <View style={styles.autoNightsRow}>
  <View>
    <Text style={styles.autoNightsLabel}>Nights</Text>
    <Text style={styles.autoNightsHint}>
      Calculated from arrival & departure
    </Text>
  </View>

  <Text style={styles.autoNightsValue}>
    {calculatedNights ?? '—'}
  </Text>
</View>
        </Section>

        <Section title="Stay Type">
          <Choice
            title="Tent Site"
           subtitle={`$${RANCH_CONFIG.pricing.tent.nightly} / night • Up to ${RANCH_CONFIG.pricing.tent.maxGuestsPerSite} guests`}
            selected={stayType === 'Tent Site'}
            onPress={() => {
  setStayType('Tent Site');
  setSelectedUnit(null);
}}
          />

          <Choice
            title="RV Site"
            subtitle="Choose utility service level"
            selected={stayType === 'RV Site'}
            onPress={() => {
  setStayType('RV Site');
  setSelectedUnit(null);
}}
          />

          <Choice
            title="Small Rental RV"
           subtitle={`$${RANCH_CONFIG.pricing.rentalRV.small.normal} / night • Sleeps ${RANCH_CONFIG.inventory.rentalRVs.small.sleepsMin}–${RANCH_CONFIG.inventory.rentalRVs.small.sleepsMax}`}
            selected={stayType === 'Small Rental RV'}
            onPress={() => {
  setStayType('Small Rental RV');
  setSelectedUnit(null);
}}
          />

          <Choice
            title="Large Rental RV"
            subtitle={`$${RANCH_CONFIG.pricing.rentalRV.large.normal} / night • Sleeps ${RANCH_CONFIG.inventory.rentalRVs.large.sleepsMin}–${RANCH_CONFIG.inventory.rentalRVs.large.sleepsMax}`}
            selected={stayType === 'Large Rental RV'}
            onPress={() => {
  setStayType('Large Rental RV');
  setSelectedUnit(null);
}}
          />
        </Section>
<Section title="Select Site / Unit">
 {stayType === 'RV Site' && (
  <>
    <Text style={styles.selectionHelp}>
      Select one of the 11 RV sites
    </Text>

    <View style={styles.unitGrid}>
      {RV_SITE_NUMBERS.map((number) => {
        const unitName = `RV ${String(number).padStart(2, '0')}`;
        const selected = selectedUnit === unitName;
        const unavailable =
          validDateRange && unavailableUnits.includes(unitName);

        return (
          <TouchableOpacity
            key={number}
            style={[
              styles.unitButton,
              selected && styles.unitButtonSelected,
              unavailable && styles.unitButtonUnavailable,
            ]}
            disabled={unavailable}
            onPress={() => setSelectedUnit(unitName)}
          >
            <Text
              style={[
                styles.unitNumber,
                selected && styles.unitNumberSelected,
              ]}
            >
              {String(number).padStart(2, '0')}
            </Text>

            <Text
              style={[
                styles.unitType,
                selected && styles.unitTypeSelected,
                unavailable && styles.unitTextUnavailable,
              ]}
            >
              {unavailable ? 'UNAVAILABLE' : 'RV'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </>
)}

{stayType === 'Tent Site' && (
  <>
    <Text style={styles.selectionHelp}>
      Select one of the 10 tent sites
    </Text>

    <View style={styles.unitGrid}>
      {TENT_SITE_NUMBERS.map((number) => {
        const unitName = `Tent ${String(number).padStart(2, '0')}`;
        const selected = selectedUnit === unitName;
        const unavailable =
          validDateRange && unavailableUnits.includes(unitName);

        return (
          <TouchableOpacity
            key={number}
            style={[
              styles.unitButton,
              selected && styles.unitButtonSelected,
              unavailable && styles.unitButtonUnavailable,
            ]}
            disabled={unavailable}
            onPress={() => setSelectedUnit(unitName)}
          >
            <Text
              style={[
                styles.unitNumber,
                selected && styles.unitNumberSelected,
              ]}
            >
              {String(number).padStart(2, '0')}
            </Text>

            <Text
              style={[
                styles.unitType,
                selected && styles.unitTypeSelected,
                unavailable && styles.unitTextUnavailable,
              ]}
            >
              {unavailable ? 'UNAVAILABLE' : 'TENT'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </>
)}

{stayType === 'Small Rental RV' && (
  <TouchableOpacity
    style={[
      styles.rentalUnit,
      selectedUnit === 'Small Rental RV' &&
        styles.rentalUnitSelected,
    ]}
    onPress={() => setSelectedUnit('Small Rental RV')}
  >
    <View>
      <Text style={styles.rentalUnitTitle}>
        Small Rental RV
      </Text>

      <Text style={styles.rentalUnitText}>
        Sleeps {RANCH_CONFIG.inventory.rentalRVs.small.sleepsMin}–
        {RANCH_CONFIG.inventory.rentalRVs.small.sleepsMax}
      </Text>
    </View>

    <Text style={styles.rentalSelect}>
      {selectedUnit === 'Small Rental RV'
        ? '✓ Selected'
        : 'Select'}
    </Text>
  </TouchableOpacity>
)}

{stayType === 'Large Rental RV' && (
  <TouchableOpacity
    style={[
      styles.rentalUnit,
      selectedUnit === 'Large Rental RV' &&
        styles.rentalUnitSelected,
      validDateRange &&
        unavailableUnits.includes('Large Rental RV') &&
        styles.rentalUnitUnavailable,
    ]}
    disabled={
      validDateRange &&
      unavailableUnits.includes('Large Rental RV')
    }
    onPress={() => setSelectedUnit('Large Rental RV')}
  >
    <View>
      <Text style={styles.rentalUnitTitle}>
        Large Rental RV
      </Text>

      <Text style={styles.rentalUnitText}>
        Sleeps {RANCH_CONFIG.inventory.rentalRVs.large.sleepsMin}–
        {RANCH_CONFIG.inventory.rentalRVs.large.sleepsMax}
      </Text>
    </View>

    <Text style={styles.rentalSelect}>
      {validDateRange &&
      unavailableUnits.includes('Large Rental RV')
        ? '🔒 Unavailable'
        : selectedUnit === 'Large Rental RV'
          ? '✓ Selected'
          : 'Select'}
    </Text>
  </TouchableOpacity>
)}

  {selectedUnit && (
    <View style={styles.selectedUnitBox}>
      <Text style={styles.selectedUnitLabel}>ASSIGNED UNIT</Text>
      <Text style={styles.selectedUnitValue}>{selectedUnit}</Text>
    </View>
  )}
</Section>
        {stayType === 'RV Site' && (
          <Section title="RV Service Level">
            <Choice
  title="Parking Only"
  subtitle={`$${RANCH_CONFIG.pricing.rv.parkingOnly.nightly} / night • No utility hookups`}
  selected={rvService === 'Parking Only'}
  onPress={() => setRVService('Parking Only')}
/>

<Choice
  title="Electric + Water"
  subtitle={`$${RANCH_CONFIG.pricing.rv.electricWater.nightly} / night`}
  selected={rvService === 'Electric + Water'}
  onPress={() => setRVService('Electric + Water')}
/>

<Choice
  title="Deluxe"
  subtitle={`$${RANCH_CONFIG.pricing.rv.deluxe.nightly} / night • Water, electric, septic & internet`}
  selected={rvService === 'Deluxe'}
  onPress={() => setRVService('Deluxe')}
/>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                All 11 RV sites support full hookups. The selected
                service level determines which utilities are unlocked
                for the reservation.
              </Text>
            </View>
          </Section>
        )}

        <Section title="Guests">
          <Counter
            label="Total Guests"
            value={guests}
            onMinus={() => changeGuests(-1)}
            onPlus={() => changeGuests(1)}
          />

         {stayType === 'Tent Site' &&
  guests > RANCH_CONFIG.pricing.tent.maxGuestsPerSite && (
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>
                Additional campsite required
              </Text>

              <Text style={styles.warningText}>
                Tent sites allow up to 6 guests per campsite.
              </Text>
            </View>
          )}
        </Section>

        <Section title="Add-ons">
          <TouchableOpacity
            style={[
              styles.addonCard,
              atvAccess && styles.addonSelected,
            ]}
            onPress={() => setAtvAccess(!atvAccess)}
          >
            <View style={styles.addonInfo}>
              <Text style={styles.addonTitle}>
                🛻 ATV / SxS Access
              </Text>

              <Text style={styles.addonSubtitle}>
                Bring a 4-wheeler or side-by-side
              </Text>

              <Text style={styles.addonNote}>
                Covers the entire overnight visit
              </Text>
            </View>

            <View style={styles.addonRight}>
             <Text style={styles.addonPrice}>
  ${RANCH_CONFIG.pricing.overnightAtvSxs}
</Text>

              <View
                style={[
                  styles.checkbox,
                  atvAccess && styles.checkboxSelected,
                ]}
              >
                {atvAccess && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </Section>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>
            RESERVATION SUMMARY
          </Text>

          <Text style={styles.summaryTitle}>
            {stayType}
          </Text>
{selectedUnit && (
  <Text style={styles.assignedSummary}>
    📍 {selectedUnit}
  </Text>
)}
          {stayType === 'RV Site' && (
            <Text style={styles.summarySub}>
              {rvService}
            </Text>
          )}

          <SummaryRow
           label={`${calculatedNights} night${calculatedNights === 1 ? '' : 's'} × $${nightlyRate}`}
            value={`$${lodgingTotal}`}
          />

         <SummaryRow
  label="ATV / SxS Access"
  value="$75"
/>

          <View style={styles.totalDivider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              Estimated Total
            </Text>

            <Text style={styles.totalValue}>
              ${total}
            </Text>
          </View>

          <Text style={styles.summaryDisclaimer}>
            Demo estimate. Special event and holiday pricing may
            change the final rate.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveReservation}
        >
          <Text style={styles.saveButtonText}>
            Create Reservation
          </Text>
        </TouchableOpacity>

        <Text style={styles.demoText}>
          Demo mode • Reservation data is not yet saved permanently
        </Text>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>
            WHITE OAK RANCH
          </Text>

          <Text style={styles.footerText}>
            Tennessee Resort & Campground
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Choice({
  title,
  subtitle,
  selected,
  onPress,
}: {
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.choice,
        selected && styles.choiceSelected,
      ]}
      onPress={onPress}
    >
      <View style={styles.choiceInfo}>
        <Text style={styles.choiceTitle}>{title}</Text>
        <Text style={styles.choiceSubtitle}>{subtitle}</Text>
      </View>

      <View
        style={[
          styles.radio,
          selected && styles.radioSelected,
        ]}
      >
        {selected && <View style={styles.radioDot} />}
      </View>
    </TouchableOpacity>
  );
}

function Counter({
  label,
  value,
  onMinus,
  onPlus,
}: {
  label: string;
  value: number;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <View style={styles.counterRow}>
      <Text style={styles.counterLabel}>{label}</Text>

      <View style={styles.counterControls}>
        <TouchableOpacity
          style={styles.counterButton}
          onPress={onMinus}
        >
          <Text style={styles.counterButtonText}>−</Text>
        </TouchableOpacity>

        <Text style={styles.counterValue}>{value}</Text>

        <TouchableOpacity
          style={styles.counterButton}
          onPress={onPlus}
        >
          <Text style={styles.counterButtonText}>＋</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryRowLabel}>{label}</Text>
      <Text style={styles.summaryRowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F1E8',
  },

  container: {
    paddingBottom: 50,
  },

  header: {
    backgroundColor: '#203B2A',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },

  backText: {
    color: '#FFFFFF',
    fontSize: 36,
    lineHeight: 38,
    marginTop: -3,
  },

  headerText: {
    flex: 1,
  },

  eyebrow: {
    color: '#D8C59D',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.8,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '900',
    marginTop: 3,
  },

  subtitle: {
    color: '#CCD4CD',
    fontSize: 13,
    marginTop: 4,
  },

  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 18,
    marginTop: 16,
    borderRadius: 18,
    padding: 18,
  },

  sectionTitle: {
    color: '#203B2A',
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 15,
  },

  inputLabel: {
    color: '#7A7E78',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
    marginBottom: 6,
  },

  input: {
    backgroundColor: '#F4F1E8',
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 12,
    color: '#203B2A',
    fontSize: 14,
    marginBottom: 14,
  },

  dateRow: {
    flexDirection: 'row',
  },

  dateColumn: {
    flex: 1,
  },

  dateSpacer: {
    width: 10,
  },

  choice: {
    borderWidth: 1,
    borderColor: '#E2DED4',
    borderRadius: 14,
    padding: 14,
    marginBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
  },

  choiceSelected: {
    backgroundColor: '#E5EDE5',
    borderColor: '#31523A',
  },

  choiceInfo: {
    flex: 1,
  },

  choiceTitle: {
    color: '#203B2A',
    fontSize: 14,
    fontWeight: '900',
  },

  choiceSubtitle: {
    color: '#7A7E78',
    fontSize: 10,
    marginTop: 3,
  },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#AAAFA8',
    justifyContent: 'center',
    alignItems: 'center',
  },

  radioSelected: {
    borderColor: '#31523A',
  },

  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#31523A',
  },

  counterRow: {
    backgroundColor: '#F4F1E8',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  counterLabel: {
    color: '#203B2A',
    fontSize: 13,
    fontWeight: '800',
  },

  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  counterButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#203B2A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  counterButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },

  counterValue: {
    minWidth: 42,
    textAlign: 'center',
    color: '#203B2A',
    fontSize: 16,
    fontWeight: '900',
  },

  infoBox: {
    backgroundColor: '#F4F1E8',
    borderRadius: 12,
    padding: 12,
    marginTop: 5,
  },

  infoText: {
    color: '#656A64',
    fontSize: 10,
    lineHeight: 15,
  },

  warningBox: {
    backgroundColor: '#F3E6D4',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },

  warningTitle: {
    color: '#79592E',
    fontSize: 12,
    fontWeight: '900',
  },

  warningText: {
    color: '#786A56',
    fontSize: 10,
    marginTop: 3,
  },

  addonCard: {
    borderWidth: 1,
    borderColor: '#E2DED4',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  addonSelected: {
    backgroundColor: '#E5EDE5',
    borderColor: '#31523A',
  },

  addonInfo: {
    flex: 1,
  },

  addonTitle: {
    color: '#203B2A',
    fontSize: 14,
    fontWeight: '900',
  },

  addonSubtitle: {
    color: '#737873',
    fontSize: 10,
    marginTop: 3,
  },

  addonNote: {
    color: '#9B7952',
    fontSize: 9,
    fontWeight: '800',
    marginTop: 4,
  },

  addonRight: {
    alignItems: 'flex-end',
  },

  addonPrice: {
    color: '#203B2A',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 8,
  },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#A6AAA4',
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkboxSelected: {
    backgroundColor: '#31523A',
    borderColor: '#31523A',
  },

  checkmark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },

  summaryCard: {
    backgroundColor: '#EAE6DA',
    marginHorizontal: 18,
    marginTop: 18,
    borderRadius: 18,
    padding: 19,
  },

  summaryLabel: {
    color: '#9B7952',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  summaryTitle: {
    color: '#203B2A',
    fontSize: 21,
    fontWeight: '900',
    marginTop: 5,
  },

  summarySub: {
    color: '#6D746D',
    fontSize: 11,
    marginTop: 2,
    marginBottom: 10,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 11,
  },

  summaryRowLabel: {
    color: '#626861',
    fontSize: 11,
  },

  summaryRowValue: {
    color: '#203B2A',
    fontSize: 11,
    fontWeight: '900',
  },

  totalDivider: {
    height: 1,
    backgroundColor: '#CEC6B6',
    marginTop: 14,
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 13,
  },

  totalLabel: {
    color: '#203B2A',
    fontSize: 15,
    fontWeight: '900',
  },

  totalValue: {
    color: '#203B2A',
    fontSize: 25,
    fontWeight: '900',
  },

  summaryDisclaimer: {
    color: '#78766E',
    fontSize: 9,
    lineHeight: 14,
    marginTop: 10,
  },

  saveButton: {
    backgroundColor: '#203B2A',
    marginHorizontal: 18,
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  demoText: {
    color: '#898C87',
    fontSize: 9,
    textAlign: 'center',
    marginTop: 9,
  },

  footer: {
    alignItems: 'center',
    marginTop: 32,
  },

  footerTitle: {
    color: '#203B2A',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },

  footerText: {
    color: '#898C87',
    fontSize: 10,
    marginTop: 4,
  },

  selectionHelp: {
    color: '#777C76',
    fontSize: 10,
    marginBottom: 12,
  },

unitGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  marginHorizontal: -4,
},

unitButton: {
  width: '30.33%',
  backgroundColor: '#F4F1E8',
  borderWidth: 1,
  borderColor: '#E1DDD3',
  borderRadius: 13,
  paddingVertical: 13,
  alignItems: 'center',
  margin: '1.5%',
},

unitButtonSelected: {
  backgroundColor: '#203B2A',
  borderColor: '#203B2A',
},

unitNumber: {
  color: '#203B2A',
  fontSize: 18,
  fontWeight: '900',
},

unitNumberSelected: {
  color: '#FFFFFF',
},

unitType: {
  color: '#858983',
  fontSize: 8,
  fontWeight: '900',
  marginTop: 3,
},

unitTypeSelected: {
  color: '#D8C59D',
},

rentalUnit: {
  backgroundColor: '#F4F1E8',
  borderWidth: 1,
  borderColor: '#E1DDD3',
  borderRadius: 14,
  padding: 15,
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},

rentalUnitSelected: {
  backgroundColor: '#E5EDE5',
  borderColor: '#31523A',
},

rentalUnitTitle: {
  color: '#203B2A',
  fontSize: 14,
  fontWeight: '900',
},

rentalUnitText: {
  color: '#777C76',
  fontSize: 10,
  marginTop: 3,
},

rentalSelect: {
  color: '#31523A',
  fontSize: 10,
  fontWeight: '900',
},

selectedUnitBox: {
  backgroundColor: '#EAE6DA',
  borderRadius: 12,
  padding: 12,
  marginTop: 12,
},

selectedUnitLabel: {
  color: '#9B7952',
  fontSize: 8,
  fontWeight: '900',
  letterSpacing: 1,
},

selectedUnitValue: {
  color: '#203B2A',
  fontSize: 16,
  fontWeight: '900',
  marginTop: 3,
},

assignedSummary: {
  color: '#9B7952',
  fontSize: 12,
  fontWeight: '800',
  marginTop: 4,
},

unitButtonUnavailable: {
  backgroundColor: '#E3E1DC',
  borderColor: '#D0CDC6',
  opacity: 0.55,
},

unitTextUnavailable: {
  color: '#8B8D89',
  fontSize: 7,
},

rentalUnitUnavailable: {
  backgroundColor: '#E3E1DC',
  borderColor: '#D0CDC6',
  opacity: 0.6,
},

autoNightsRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: '#F5F3EE',
  borderRadius: 12,
  padding: 14,
  marginTop: 10,
},

autoNightsLabel: {
  fontSize: 14,
  fontWeight: '800',
  color: '#2F3A2F',
},

autoNightsHint: {
  fontSize: 9,
  color: '#7A7A72',
  marginTop: 3,
},

autoNightsValue: {
  fontSize: 22,
  fontWeight: '900',
  color: '#31523A',
},
});