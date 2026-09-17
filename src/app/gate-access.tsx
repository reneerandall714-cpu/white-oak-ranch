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

const accessRecords = [
  {
    id: '1',
    name: 'James Carter',
    type: 'RV Reservation',
    detail: 'RV-03 • Deluxe',
    status: 'ACTIVE',
  },
  {
    id: '2',
    name: 'Amanda Lewis',
    type: 'Day Pass',
    detail: 'Valid today',
    status: 'ACTIVE',
  },
  {
    id: '3',
    name: 'Demo Guest',
    type: 'Annual Membership',
    detail: 'Valid through Sep 16, 2027',
    status: 'ACTIVE',
  },
  {
    id: '4',
    name: 'Chris Walker',
    type: 'Upcoming Reservation',
    detail: 'Begins Sep 20',
    status: 'SCHEDULED',
  },
];

const recentActivity = [
  {
    id: '1',
    name: 'James Carter',
    time: '2:43 PM',
    method: 'Guest App',
  },
  {
    id: '2',
    name: 'Amanda Lewis',
    time: '1:17 PM',
    method: 'Day Pass',
  },
  {
    id: '3',
    name: 'Staff Access',
    time: '11:06 AM',
    method: 'Admin',
  },
];

export default function GateAccessScreen() {
  const [gateOpen, setGateOpen] = useState(false);
  const [holdOpen, setHoldOpen] = useState(false);

  function openGate() {
    Alert.alert(
      'Open Front Gate?',
      'Demo mode only. The live system will verify staff permissions before sending the gate command.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Gate',
          onPress: () => {
            setGateOpen(true);

            setTimeout(() => {
              if (!holdOpen) setGateOpen(false);
            }, 5000);
          },
        },
      ]
    );
  }

  function toggleHoldOpen() {
    setHoldOpen((current) => !current);
    setGateOpen((current) => !holdOpen || current);
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
            <Text style={styles.title}>Gate Access</Text>
            <Text style={styles.subtitle}>Front gate control & access</Text>
          </View>
        </View>

        <View style={styles.gateStatus}>
          <View>
            <Text style={styles.statusLabel}>FRONT GATE</Text>

            <Text style={styles.statusTitle}>
              {holdOpen
                ? 'Held Open'
                : gateOpen
                ? 'Opening'
                : 'Ready'}
            </Text>
          </View>

          <View
            style={[
              styles.onlineBadge,
              holdOpen && styles.warningBadge,
            ]}
          >
            <Text style={styles.onlineText}>
              {holdOpen ? 'HOLD OPEN' : '● ONLINE'}
            </Text>
          </View>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.primaryControl}
            onPress={openGate}
          >
            <Text style={styles.controlIcon}>🔓</Text>
            <Text style={styles.primaryControlText}>
              OPEN FRONT GATE
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryControl,
              holdOpen && styles.secondaryControlActive,
            ]}
            onPress={toggleHoldOpen}
          >
            <Text style={styles.secondaryControlText}>
              {holdOpen ? 'RELEASE HOLD OPEN' : 'HOLD GATE OPEN'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.demoText}>
            Demo mode • Ghost Controls integration pending
          </Text>
        </View>

        <View style={styles.statsRow}>
          <StatBox value="3" label="Active Now" />
          <StatBox value="1" label="Scheduled" />
          <StatBox value="3" label="Entries Today" />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Current Access</Text>

          <TouchableOpacity>
            <Text style={styles.addAccess}>+ Grant Access</Text>
          </TouchableOpacity>
        </View>

        {accessRecords.map((record) => (
          <AccessRecord
            key={record.id}
            name={record.name}
            type={record.type}
            detail={record.detail}
            status={record.status}
          />
        ))}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Gate Activity</Text>
        </View>

        <View style={styles.activityBox}>
          {recentActivity.map((item) => (
            <View key={item.id} style={styles.activityRow}>
              <View style={styles.activityIcon}>
                <Text>🚪</Text>
              </View>

              <View style={styles.activityBody}>
                <Text style={styles.activityName}>{item.name}</Text>
                <Text style={styles.activityMethod}>{item.method}</Text>
              </View>

              <Text style={styles.activityTime}>{item.time}</Text>
            </View>
          ))}
        </View>

        <View style={styles.securityBox}>
          <Text style={styles.securityLabel}>SECURITY DESIGN</Text>
          <Text style={styles.securityTitle}>
            Access without sharing the ranch gate code
          </Text>

          <SecurityRow text="Reservation access expires automatically" />
          <SecurityRow text="Day passes work only during valid access hours" />
          <SecurityRow text="Membership access follows membership status" />
          <SecurityRow text="Staff can revoke access immediately" />
          <SecurityRow text="Gate commands can be logged" />
          <SecurityRow text="Guests never receive permanent gate credentials" />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>WHITE OAK RANCH</Text>
          <Text style={styles.footerText}>
            Secure Access Management
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AccessRecord({
  name,
  type,
  detail,
  status,
}: {
  name: string;
  type: string;
  detail: string;
  status: string;
}) {
  return (
    <TouchableOpacity style={styles.accessCard}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{name.charAt(0)}</Text>
      </View>

      <View style={styles.accessBody}>
        <Text style={styles.accessName}>{name}</Text>
        <Text style={styles.accessType}>{type}</Text>
        <Text style={styles.accessDetail}>{detail}</Text>
      </View>

      <View
        style={[
          styles.accessBadge,
          status === 'ACTIVE'
            ? styles.activeBadge
            : styles.scheduledBadge,
        ]}
      >
        <Text style={styles.accessBadgeText}>{status}</Text>
      </View>
    </TouchableOpacity>
  );
}

function StatBox({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SecurityRow({ text }: { text: string }) {
  return (
    <View style={styles.securityRow}>
      <Text style={styles.check}>✓</Text>
      <Text style={styles.securityText}>{text}</Text>
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

  gateStatus: {
    marginHorizontal: 18,
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  statusLabel: {
    color: '#9B7952',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  statusTitle: {
    color: '#203B2A',
    fontSize: 25,
    fontWeight: '900',
    marginTop: 4,
  },

  onlineBadge: {
    backgroundColor: '#E5EEE7',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },

  warningBadge: {
    backgroundColor: '#F0DFC5',
  },

  onlineText: {
    color: '#203B2A',
    fontSize: 9,
    fontWeight: '900',
  },

  controls: {
    marginHorizontal: 18,
    marginTop: 14,
    backgroundColor: '#203B2A',
    borderRadius: 18,
    padding: 20,
  },

  primaryControl: {
    backgroundColor: '#D8C59D',
    borderRadius: 14,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },

  controlIcon: {
    fontSize: 19,
    marginRight: 9,
  },

  primaryControlText: {
    color: '#203B2A',
    fontSize: 15,
    fontWeight: '900',
  },

  secondaryControl: {
    borderWidth: 1,
    borderColor: '#6E806F',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },

  secondaryControlActive: {
    backgroundColor: '#58705E',
  },

  secondaryControlText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },

  demoText: {
    color: '#BFC8C0',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 10,
  },

  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 14,
    marginTop: 16,
  },

  statBox: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 14,
    alignItems: 'center',
  },

  statValue: {
    color: '#203B2A',
    fontSize: 21,
    fontWeight: '900',
  },

  statLabel: {
    color: '#787C76',
    fontSize: 10,
    marginTop: 3,
    textAlign: 'center',
  },

  sectionHeader: {
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  sectionTitle: {
    color: '#203B2A',
    fontSize: 20,
    fontWeight: '900',
  },

  addAccess: {
    color: '#9B7952',
    fontSize: 12,
    fontWeight: '900',
  },

  accessCard: {
    marginHorizontal: 18,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#EAE6DA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  avatarText: {
    color: '#203B2A',
    fontSize: 17,
    fontWeight: '900',
  },

  accessBody: {
    flex: 1,
  },

  accessName: {
    color: '#203B2A',
    fontSize: 15,
    fontWeight: '900',
  },

  accessType: {
    color: '#6D716C',
    fontSize: 11,
    marginTop: 2,
  },

  accessDetail: {
    color: '#9B7952',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },

  accessBadge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  activeBadge: {
    backgroundColor: '#E5EEE7',
  },

  scheduledBadge: {
    backgroundColor: '#E8E6DF',
  },

  accessBadgeText: {
    color: '#203B2A',
    fontSize: 8,
    fontWeight: '900',
  },

  activityBox: {
    marginHorizontal: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
  },

  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEAE1',
  },

  activityIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EEF0E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  activityBody: {
    flex: 1,
  },

  activityName: {
    color: '#203B2A',
    fontSize: 13,
    fontWeight: '800',
  },

  activityMethod: {
    color: '#7B7E79',
    fontSize: 10,
    marginTop: 2,
  },

  activityTime: {
    color: '#9B7952',
    fontSize: 11,
    fontWeight: '800',
  },

  securityBox: {
    marginHorizontal: 18,
    marginTop: 20,
    backgroundColor: '#EAE6DA',
    borderRadius: 18,
    padding: 20,
  },

  securityLabel: {
    color: '#9B7952',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.3,
  },

  securityTitle: {
    color: '#203B2A',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 5,
    marginBottom: 12,
  },

  securityRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },

  check: {
    color: '#203B2A',
    fontWeight: '900',
    marginRight: 8,
  },

  securityText: {
    color: '#626660',
    fontSize: 12,
    flex: 1,
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