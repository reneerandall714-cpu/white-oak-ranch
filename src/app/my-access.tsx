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

export default function MyAccessScreen() {
  const [gateOpened, setGateOpened] = useState(false);

  function handleOpenGate() {
    Alert.alert(
      'Open Front Gate?',
      'Demo mode only. This will eventually send a secure gate-open request after verifying the guest has active access.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Open Gate',
          onPress: () => {
            setGateOpened(true);

            setTimeout(() => {
              setGateOpened(false);
            }, 5000);
          },
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
            <Text style={styles.title}>My Access</Text>
            <Text style={styles.subtitle}>Gate & ranch access</Text>
          </View>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusTop}>
            <View>
              <Text style={styles.statusLabel}>ACCESS STATUS</Text>
              <Text style={styles.statusTitle}>Demo preview</Text>
            </View>

            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>DEMO ONLY</Text>
            </View>
          </View>

          <Text style={styles.statusText}>
            This screen does not verify a live pass, reservation or gate access.
          </Text>
        </View>

        <View style={styles.passCard}>
          <Text style={styles.passLabel}>CURRENT ACCESS</Text>

          <Text style={styles.passTitle}>Annual Membership</Text>

          <View style={styles.divider} />

          <AccessRow label="Member" value="Demo Guest" />
          <AccessRow label="Access Type" value="Individual Membership" />
          <AccessRow label="Valid Through" value="September 16, 2027" />
          <AccessRow label="Gate Access" value="Enabled" />
        </View>

        <View style={styles.gateCard}>
          <Text style={styles.gateLabel}>FRONT GATE</Text>

          <Text style={styles.gateTitle}>
            {gateOpened ? 'Demo gate animation...' : 'Gate control demo'}
          </Text>

          <Text style={styles.gateText}>
            Gate access will only be available while your reservation, day pass
            or membership is active.
          </Text>

          <TouchableOpacity
            style={[
              styles.gateButton,
              gateOpened && styles.gateButtonActive,
            ]}
            onPress={handleOpenGate}
            disabled={gateOpened}
          >
            <Text style={styles.gateIcon}>🔓</Text>

            <Text style={styles.gateButtonText}>
              {gateOpened ? 'OPENING GATE...' : 'OPEN FRONT GATE'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.demoText}>
            Demo mode • Ghost gate integration coming later
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Access</Text>

          <AccessCard
            icon="🌳"
            title="Annual Membership"
            subtitle="Active through Sep 16, 2027"
            status="ACTIVE"
          />

          <AccessCard
            icon="🎟️"
            title="Day Passes"
            subtitle="No upcoming day passes"
            status="NONE"
          />

          <AccessCard
            icon="🏕️"
            title="Reservations"
            subtitle="No upcoming stays"
            status="NONE"
          />
        </View>

        <View style={styles.securityBox}>
          <Text style={styles.securityTitle}>Secure access</Text>

          <Text style={styles.securityText}>
            The final system will verify account status and access dates before
            any gate command is sent. Gate activity can also be logged for staff.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>WHITE OAK RANCH</Text>
          <Text style={styles.footerText}>
            Tennessee Resort & Campground
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AccessRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function AccessCard({
  icon,
  title,
  subtitle,
  status,
}: {
  icon: string;
  title: string;
  subtitle: string;
  status: string;
}) {
  return (
    <View style={styles.accessCard}>
      <View style={styles.iconBox}>
        <Text style={styles.icon}>{icon}</Text>
      </View>

      <View style={styles.accessBody}>
        <Text style={styles.accessTitle}>{title}</Text>
        <Text style={styles.accessSubtitle}>{subtitle}</Text>
      </View>

      <Text
        style={[
          styles.accessStatus,
          status === 'ACTIVE' && styles.accessStatusActive,
        ]}
      >
        {status}
      </Text>
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
    fontSize: 30,
    fontWeight: '900',
    marginTop: 3,
  },

  subtitle: {
    color: '#CCD4CD',
    fontSize: 13,
    marginTop: 4,
  },

  statusCard: {
    marginHorizontal: 18,
    marginTop: 22,
    backgroundColor: '#203B2A',
    borderRadius: 18,
    padding: 20,
  },

  statusTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  statusLabel: {
    color: '#D8C59D',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  statusTitle: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '900',
    marginTop: 4,
  },

  activeBadge: {
    backgroundColor: '#D8C59D',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },

  activeBadgeText: {
    color: '#203B2A',
    fontSize: 10,
    fontWeight: '900',
  },

  statusText: {
    color: '#D6DDD7',
    fontSize: 13,
    marginTop: 12,
  },

  passCard: {
    marginHorizontal: 18,
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
  },

  passLabel: {
    color: '#9B7952',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  passTitle: {
    color: '#203B2A',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 6,
  },

  divider: {
    height: 1,
    backgroundColor: '#ECE9E1',
    marginVertical: 16,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
  },

  rowLabel: {
    color: '#727670',
    fontSize: 13,
  },

  rowValue: {
    color: '#203B2A',
    fontSize: 13,
    fontWeight: '800',
  },

  gateCard: {
    marginHorizontal: 18,
    marginTop: 14,
    backgroundColor: '#EAE6DA',
    borderRadius: 18,
    padding: 20,
  },

  gateLabel: {
    color: '#9B7952',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  gateTitle: {
    color: '#203B2A',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 5,
  },

  gateText: {
    color: '#626660',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },

  gateButton: {
    backgroundColor: '#203B2A',
    borderRadius: 14,
    paddingVertical: 17,
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  gateButtonActive: {
    backgroundColor: '#58705E',
  },

  gateIcon: {
    fontSize: 20,
    marginRight: 9,
  },

  gateButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  demoText: {
    color: '#878A84',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 9,
  },

  section: {
    paddingHorizontal: 18,
    marginTop: 24,
  },

  sectionTitle: {
    color: '#203B2A',
    fontSize: 21,
    fontWeight: '900',
    marginBottom: 12,
  },

  accessCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EEF0E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
  },

  icon: {
    fontSize: 23,
  },

  accessBody: {
    flex: 1,
  },

  accessTitle: {
    color: '#203B2A',
    fontSize: 15,
    fontWeight: '800',
  },

  accessSubtitle: {
    color: '#747873',
    fontSize: 12,
    marginTop: 3,
  },

  accessStatus: {
    color: '#898C87',
    fontSize: 9,
    fontWeight: '900',
  },

  accessStatusActive: {
    color: '#4C7256',
  },

  securityBox: {
    marginHorizontal: 18,
    marginTop: 16,
    borderRadius: 16,
    padding: 17,
    borderWidth: 1,
    borderColor: '#D7D1C3',
  },

  securityTitle: {
    color: '#203B2A',
    fontSize: 15,
    fontWeight: '900',
  },

  securityText: {
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
