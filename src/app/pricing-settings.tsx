import { router } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RANCH_CONFIG } from '../data/ranchConfig';

type RateItem = {
  id: string;
  label: string;
  value: string;
  note?: string;
};

export default function PricingSettingsScreen() {
  const [saved, setSaved] = useState(false);

  const rvRates: RateItem[] = [
    { id: '1', label: 'Parking Only', value: `$${RANCH_CONFIG.pricing.rv.parkingOnly.nightly}/night`, note: `$${RANCH_CONFIG.pricing.rv.parkingOnly.weekly}/7 nights` },
    { id: '2', label: 'Electric + Water', value: `$${RANCH_CONFIG.pricing.rv.electricWater.nightly}/night`, note: `$${RANCH_CONFIG.pricing.rv.electricWater.weekly}/7 nights` },
    { id: '3', label: 'Full Hookup (Deluxe service)', value: `$${RANCH_CONFIG.pricing.rv.deluxe.nightly}/night`, note: `$${RANCH_CONFIG.pricing.rv.deluxe.weekly}/7 nights` },
    { id: '4', label: 'Deluxe + Wi-Fi', value: `$${RANCH_CONFIG.pricing.rv.deluxe.nightly}/night`, note: 'Same verified Deluxe service' },
  ];

  const campingRates: RateItem[] = [
    { id: '1', label: 'Tent Site', value: '$25/night' },
    { id: '2', label: 'Additional Adult', value: '$10' },
    { id: '3', label: 'Additional Child', value: '$5' },
    { id: '4', label: 'Additional Vehicle', value: '$10' },
  ];

  const accessRates: RateItem[] = [
    { id: '1', label: 'Primary Day Pass', value: '$15' },
    { id: '2', label: 'Additional Day Pass', value: '$10' },
    { id: '3', label: 'ATV / SxS Day Access', value: '$50', note: 'Proposed' },
    { id: '4', label: 'ATV / SxS Overnight Access', value: '$75/stay' },
  ];

  const membershipRates: RateItem[] = [
    { id: '1', label: 'Individual Membership', value: '$145/year' },
    { id: '2', label: 'Family Membership', value: 'From $275/year' },
    { id: '3', label: 'RV Membership + Storage', value: 'From $1,500/year' },
  ];

  const rentalRates: RateItem[] = [
    {
      id: '1',
      label: 'Rental RV • Sleeps 4–5',
      value: '$75/night',
      note: '$99 events/holidays',
    },
    {
      id: '2',
      label: 'Rental RV • Sleeps 6–8',
      value: '$99/night',
      note: '$125 events/holidays',
    },
  ];

  function handleSave() {
    Alert.alert(
      'Save Pricing Changes?',
      'Demo mode only. In the live system, authorized admins will be able to update pricing without changing app code.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: () => setSaved(true),
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <View>
            <Text style={styles.eyebrow}>WHITE OAK RANCH</Text>
            <Text style={styles.title}>Pricing & Settings</Text>
            <Text style={styles.subtitle}>Rates, access & business rules</Text>
          </View>
        </View>

        <View style={styles.intro}>
          <Text style={styles.introTitle}>Control the ranch from one place.</Text>
          <Text style={styles.introText}>
            Pricing, access rules and event overrides can eventually be managed
            here without publishing a new version of the app.
          </Text>
        </View>

        <SettingsSection title="RV SITE RATES" items={rvRates} />

        <SettingsSection title="TENT CAMPING" items={campingRates} />

        <SettingsSection title="DAY PASSES & ACCESS" items={accessRates} />

        <SettingsSection title="MEMBERSHIPS" items={membershipRates} />

        <SettingsSection title="RENTAL RVs" items={rentalRates} />

        <View style={styles.ruleCard}>
          <Text style={styles.ruleLabel}>EVENT / HOLIDAY PRICING</Text>
          <Text style={styles.ruleTitle}>Date-based overrides</Text>
          <Text style={styles.ruleText}>
            Special-event rates can automatically replace standard pricing for
            selected dates without changing the normal rate table.
          </Text>

          <TouchableOpacity style={styles.ruleButton}>
            <Text style={styles.ruleButtonText}>Manage Event Pricing</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.ruleCard}>
          <Text style={styles.ruleLabel}>ACCESS RULES</Text>
          <Text style={styles.ruleTitle}>Gate access windows</Text>

          <RuleRow label="Day Pass Access" value="Valid day only" />
          <RuleRow label="Reservation Access" value="During stay" />
          <RuleRow label="Membership Access" value="While active" />
          <RuleRow label="Staff Access" value="Role controlled" />
        </View>

        <View style={styles.ruleCard}>
          <Text style={styles.ruleLabel}>INVENTORY</Text>
          <Text style={styles.ruleTitle}>Current ranch capacity</Text>

          <RuleRow label="RV Sites" value="11" />
          <RuleRow label="Tent Sites" value="10" />
          <RuleRow label="Rental RVs" value="2" />
        </View>

        <TouchableOpacity
          style={[
            styles.saveButton,
            saved && styles.savedButton,
          ]}
          onPress={handleSave}
          disabled={saved}
        >
          <Text style={styles.saveButtonText}>
            {saved ? '✓ SETTINGS SAVED' : 'SAVE CHANGES'}
          </Text>
        </TouchableOpacity>

        <View style={styles.noteBox}>
          <Text style={styles.noteTitle}>Live version</Text>
          <Text style={styles.noteText}>
            In production, values shown here will come from the database instead
            of being hard-coded into the app. Authorized users will be able to
            change rates, availability rules and access settings from this screen.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>WHITE OAK RANCH</Text>
          <Text style={styles.footerText}>Business Controls</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsSection({
  title,
  items,
}: {
  title: string;
  items: RateItem[];
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>

      <View style={styles.settingsCard}>
        {items.map((item, index) => (
          <View
            key={item.id}
            style={[
              styles.settingRow,
              index === items.length - 1 && styles.lastRow,
            ]}
          >
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>{item.label}</Text>

              {item.note && (
                <Text style={styles.settingNote}>{item.note}</Text>
              )}
            </View>

            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>{item.value}</Text>
              <Text style={styles.editText}>Edit</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function RuleRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.ruleRow}>
      <Text style={styles.ruleRowLabel}>{label}</Text>
      <Text style={styles.ruleRowValue}>{value}</Text>
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

  eyebrow: {
    color: '#D8C59D',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.8,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 3,
  },

  subtitle: {
    color: '#CCD4CD',
    fontSize: 13,
    marginTop: 4,
  },

  intro: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 10,
  },

  introTitle: {
    color: '#203B2A',
    fontSize: 24,
    fontWeight: '900',
  },

  introText: {
    color: '#646963',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },

  section: {
    marginTop: 20,
  },

  sectionLabel: {
    color: '#777B76',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginHorizontal: 22,
    marginBottom: 9,
  },

  settingsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 18,
    borderRadius: 18,
    paddingHorizontal: 16,
  },

  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ECE9E1',
  },

  lastRow: {
    borderBottomWidth: 0,
  },

  settingLeft: {
    flex: 1,
    paddingRight: 12,
  },

  settingLabel: {
    color: '#203B2A',
    fontSize: 14,
    fontWeight: '800',
  },

  settingNote: {
    color: '#898C87',
    fontSize: 11,
    marginTop: 3,
  },

  settingRight: {
    alignItems: 'flex-end',
  },

  settingValue: {
    color: '#9B7952',
    fontSize: 14,
    fontWeight: '900',
  },

  editText: {
    color: '#6E726D',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
  },

  ruleCard: {
    backgroundColor: '#EAE6DA',
    marginHorizontal: 18,
    marginTop: 18,
    borderRadius: 18,
    padding: 20,
  },

  ruleLabel: {
    color: '#9B7952',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.3,
  },

  ruleTitle: {
    color: '#203B2A',
    fontSize: 19,
    fontWeight: '900',
    marginTop: 5,
  },

  ruleText: {
    color: '#646963',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },

  ruleButton: {
    backgroundColor: '#203B2A',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 14,
  },

  ruleButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },

  ruleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#D5D0C4',
  },

  ruleRowLabel: {
    color: '#676B66',
    fontSize: 12,
  },

  ruleRowValue: {
    color: '#203B2A',
    fontSize: 12,
    fontWeight: '800',
  },

  saveButton: {
    marginHorizontal: 18,
    marginTop: 22,
    backgroundColor: '#203B2A',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },

  savedButton: {
    backgroundColor: '#58705E',
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },

  noteBox: {
    marginHorizontal: 18,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#D7D1C3',
    borderRadius: 16,
    padding: 17,
  },

  noteTitle: {
    color: '#203B2A',
    fontSize: 15,
    fontWeight: '900',
  },

  noteText: {
    color: '#686C67',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },

  footer: {
    alignItems: 'center',
    marginTop: 34,
  },

  footerTitle: {
    color: '#203B2A',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },

  footerText: {
    color: '#898C87',
    fontSize: 11,
    marginTop: 4,
  },
});
