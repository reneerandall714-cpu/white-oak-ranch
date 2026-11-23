import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { calculateLiveStayPricing } from '../data/liveReservationPricing';
import { RANCH_CONFIG } from '../data/ranchConfig';

const options = ['Deluxe RV Site', 'Tent Site', 'Day Pass'] as const;
type Visit = typeof options[number];
type Step = 'guest' | 'staff' | 'checkout' | 'balance' | 'confirmed' | 'declined';

const inventory = RANCH_CONFIG.inventory;
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function Button({ label, onPress, secondary = false, selected }: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  selected?: boolean;
}) {
  const outlined = secondary || selected === false;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={selected === undefined ? undefined : { selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.button, outlined && styles.outlined, pressed && styles.pressed]}
    >
      <Text style={outlined ? styles.outlinedText : styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

export function OwnerDemo() {
  const [step, setStep] = useState<Step>('guest');
  const [visit, setVisit] = useState<Visit>('Deluxe RV Site');
  const [nights, setNights] = useState(2);
  const [atv, setAtv] = useState(false);
  const dayPass = visit === 'Day Pass';
  const stay = calculateLiveStayPricing({
    stayType: visit === 'Deluxe RV Site' ? 'RV Site' : 'Tent Site',
    rvService: visit === 'Deluxe RV Site' ? 'Deluxe' : undefined,
    nights,
    atvAccess: atv,
  });
  const base = dayPass ? RANCH_CONFIG.pricing.dayPass.primary : stay.lodgingTotal;
  const atvFee = dayPass ? (atv ? RANCH_CONFIG.pricing.dayPass.atvSxs : 0) : stay.atvTotal;
  const total = base + atvFee;
  const deposit = Math.round(total * 25) / 100;
  const description = dayPass ? '1 guest · 1 day' : nights + ' nights';
  const stage = step === 'guest' ? 'Guest booking' : step === 'staff' || step === 'declined'
    ? 'Staff review' : 'Guest checkout';

  function reset() {
    setVisit('Deluxe RV Site');
    setNights(2);
    setAtv(false);
    setStep('guest');
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.page}>
      <View style={styles.hero}>
        <Image
          source={require('../../assets/white-oak-ranch-logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
        <View style={styles.brand}>
          <Text style={styles.location}>DUNLAP, TENNESSEE</Text>
          <Text accessibilityRole="header" style={styles.title}>White Oak Ranch</Text>
          <Text style={styles.subtitle}>Owner demo · Sample bookings and simulated payments</Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.card}>
          <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={styles.heading}>{stage}</Text>
          {step === 'guest' ? <>
            <Text style={styles.copy}>Choose a visit for the sample guest.</Text>
            <View style={styles.row}>
              {options.map(option => (
                <Button key={option} label={option} selected={visit === option} onPress={() => setVisit(option)} />
              ))}
            </View>
            {!dayPass && <View style={styles.row}>
              <Button label="2 nights" selected={nights === 2} onPress={() => setNights(2)} />
              <Button label="7 nights" selected={nights === 7} onPress={() => setNights(7)} />
            </View>}
            <Button label={'ATV / SxS access · ' + (atv ? 'Added' : 'Add')}
              selected={atv} onPress={() => setAtv(value => !value)} />
          </> : <View style={styles.record}>
            <Text style={styles.recordTitle}>WOR-DEMO-001 · Jamie Morgan</Text>
            <Text style={styles.copy}>{visit} · {description}{atv ? ' · ATV / SxS' : ''}</Text>
          </View>}

          <View style={styles.quote}>
            <View style={styles.line}>
              <Text style={styles.copy}>{dayPass ? 'Day admission' : 'Lodging'}</Text>
              <Text style={styles.copy}>{money.format(base)}</Text>
            </View>
            {atv && <View style={styles.line}>
              <Text style={styles.copy}>ATV / SxS access</Text>
              <Text style={styles.copy}>{money.format(atvFee)}</Text>
            </View>}
            <View style={styles.line}>
              <Text style={styles.recordTitle}>Sample total</Text>
              <Text style={styles.recordTitle}>{money.format(total)}</Text>
            </View>
          </View>

          {step === 'guest' && <Button label="Submit sample request" onPress={() => setStep('staff')} />}
          {step === 'staff' && <>
            <Text style={styles.copy}>Pending staff decision. Approval opens the sample checkout.</Text>
            <View style={styles.row}>
              <Button label="Approve request" onPress={() => setStep('checkout')} />
              <Button label="Decline request" secondary onPress={() => setStep('declined')} />
            </View>
          </>}
          {step === 'checkout' && <>
            <Text style={styles.copy}>Approved · Ready for simulated checkout.</Text>
            <View style={styles.row}>
              <Button label={'Simulate full payment · ' + money.format(total)} onPress={() => setStep('confirmed')} />
              {!dayPass && <Button label={'Simulate 25% deposit · ' + money.format(deposit)}
                secondary onPress={() => setStep('balance')} />}
            </View>
          </>}
          {step === 'balance' && <>
            <Text accessibilityLiveRegion="polite" style={styles.notice}>
              Stay confirmed · Sample deposit received · {money.format(total - deposit)} balance due
            </Text>
            <Button label={'Simulate balance payment · ' + money.format(total - deposit)} onPress={() => setStep('confirmed')} />
          </>}
          {step === 'confirmed' && <Text accessibilityLiveRegion="polite" style={styles.notice}>
            {dayPass ? 'Day pass issued' : 'Stay confirmed'} · Paid in full in the demo
          </Text>}
          {step === 'declined' && <Text accessibilityLiveRegion="polite" style={styles.notice}>
            Request declined · Sample checkout closed
          </Text>}
          {step !== 'guest' && <Button label="Start over" secondary onPress={reset} />}
        </View>

        <View style={styles.inventory}>
          <Text style={styles.inventoryTitle}>Ranch inventory</Text>
          <Text style={styles.copy}>
            {inventory.rvSites} RV sites · {inventory.tentSites} tent sites · {Object.keys(inventory.rentalRVs).length} rental RVs
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F1E8' },
  page: { alignItems: 'center', paddingBottom: 32 },
  hero: {
    backgroundColor: '#203B2A', width: '100%', paddingHorizontal: 18, paddingVertical: 25,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12,
  },
  logo: { width: 64, height: 64 },
  brand: { flexShrink: 1, gap: 4 },
  location: { color: '#D8C59D', fontSize: 14, fontWeight: '700', letterSpacing: 1.1 },
  title: { color: '#FFFFFF', fontSize: 34, fontWeight: '900' },
  subtitle: { color: '#F1E8D8', fontSize: 16, lineHeight: 22 },
  body: { width: '100%', maxWidth: 790, paddingHorizontal: 16, paddingTop: 22, gap: 14 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, gap: 16 },
  heading: { color: '#203B2A', fontSize: 27, fontWeight: '900' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: {
    alignSelf: 'flex-start', borderWidth: 1, borderColor: '#203B2A', backgroundColor: '#203B2A',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, minHeight: 44, justifyContent: 'center',
  },
  outlined: { backgroundColor: '#FFFFFF', borderColor: '#798C7E' },
  pressed: { opacity: 0.72 },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  outlinedText: { color: '#203B2A', fontWeight: '700', fontSize: 14 },
  copy: { color: '#47574D', fontSize: 16, lineHeight: 23 },
  record: { gap: 4 },
  recordTitle: { color: '#203B2A', fontSize: 17, fontWeight: '800' },
  quote: { backgroundColor: '#F4F1E8', padding: 14, borderRadius: 8, gap: 9 },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  notice: { backgroundColor: '#E5EFE7', borderRadius: 8, color: '#203B2A', padding: 14, fontSize: 16, lineHeight: 23, fontWeight: '700' },
  inventory: { paddingHorizontal: 4, gap: 4 },
  inventoryTitle: { color: '#203B2A', fontWeight: '800', fontSize: 16 },
});
