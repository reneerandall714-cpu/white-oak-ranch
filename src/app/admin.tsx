import { router } from 'expo-router';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStaffAuth } from '../contexts/staff-auth-context';

export default function AdminScreen() {
  const { error, isLoading, signOut } = useStaffAuth();

  const handleSignOut = () => {
    void signOut().then((signedOut) => {
      if (signedOut) router.replace('/');
    });
  };

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
            <Text style={styles.title}>Staff & Admin</Text>
            <Text style={styles.subtitle}>Operations dashboard</Text>
          </View>
        </View>

        <View style={styles.welcome}>
          <Text style={styles.welcomeTitle}>Ranch Operations</Text>
          <Text style={styles.welcomeText}>
            Manage guests, reservations, staff, access, events and payments
            from one place.
          </Text>
        </View>

        <View style={styles.stats}>
          <StatCard label="RV Sites" value="11" subtext="Deluxe-capable" />
          <StatCard label="Tent Sites" value="10" subtext="Available inventory" />
          <StatCard label="Rental RVs" value="2" subtext="Ranch-owned units" />
          <StatCard label="Gate" value="Online" subtext="Access system" />
        </View>

        <Text style={styles.sectionLabel}>OPERATIONS</Text>

       <AdminCard
  icon="📋"
  title="Reservations"
  subtitle="Bookings, arrivals & lodging availability"
 onPress={() => router.push('/manage-reservations')}
/>
       <AdminCard
  icon="🎟️"
  title="Day Passes & Memberships"
  subtitle="Access status, renewals and customer records"
  onPress={() =>
    router.push({
      pathname: '/feature-preview',
      params: {
        title: 'Passes & Memberships',
        icon: '🎟️',
        description:
          'Manage day passes, annual memberships, renewals, member records and ranch access from one staff workspace.',
      },
    })
  }
/>

       <AdminCard
  icon="🔐"
  title="Gate Access"
  subtitle="Temporary access, members, guests and activity logs"
  onPress={() => router.push('/gate-access')}
/>

       <AdminCard
  icon="🎉"
  title="Events"
  subtitle="Create events, pricing, registrations and schedules"
  onPress={() => router.push('/manage-events')}
/>

        <Text style={styles.sectionLabel}>STAFF</Text>

        <AdminCard
         icon="⏱️"
         title="Clock In / Clock Out"
         subtitle="Contractor time tracking and submitted hours"
         onPress={() => router.push('/time-clock')}
/>
        <AdminCard
          icon="🗓️"
          title="Staff Scheduling"
         subtitle="Shifts, assignments and event staffing"
          onPress={() => router.push('/staff-schedule')}
/>

        <AdminCard
  icon="💵"
  title="Contractor Payments"
  subtitle="Review hours, calculate pay and prepare payment batches"
  onPress={() => router.push('/contractor-payments')}
/>

       <AdminCard
  icon="📄"
  title="Contractor Documents"
  subtitle="W-9 status, records and payment history"
  onPress={() =>
    router.push({
      pathname: '/feature-preview',
      params: {
        title: 'Contractor Documents',
        icon: '📄',
        description:
          'Securely organize contractor records, W-9 status, agreements, payment history and permitted documents.',
      },
    })
  }
/>

        <Text style={styles.sectionLabel}>BUSINESS</Text>

        <AdminCard
  icon="💳"
  title="Payments"
  subtitle="Reservations, passes, memberships and event revenue"
  onPress={() => router.push('/payments')}
/>

       <AdminCard
  icon="📊"
  title="Reports"
  subtitle="Revenue, occupancy, attendance and labor"
  onPress={() =>
    router.push({
      pathname: '/feature-preview',
      params: {
        title: 'Reports & Analytics',
        icon: '📊',
        description:
          'Track revenue, campground occupancy, membership activity, event attendance, labor hours and business trends.',
      },
    })
  }
/>

        <AdminCard
  icon="⚙️"
  title="Pricing & Settings"
  subtitle="Rates, event pricing, access rules and inventory"
  onPress={() => router.push('/pricing-settings')}
/>

        <AdminCard
          icon="▦"
          title="Inventory"
          subtitle="View the ranch units available for reservations"
          onPress={() => router.push('/inventory')}
        />

        <View style={styles.integrationBox}>
          <Text style={styles.integrationLabel}>PLANNED INTEGRATIONS</Text>
          <Text style={styles.integrationTitle}>
            One system, fewer loose ends.
          </Text>

          <IntegrationRow text="QuickBooks accounting" />
          <IntegrationRow text="ACH contractor payments" />
          <IntegrationRow text="Ghost gate controls" />
          <IntegrationRow text="Online customer payments" />
        </View>

        {error ? <Text style={styles.authError}>{error}</Text> : null}

        <TouchableOpacity
          disabled={isLoading}
          onPress={handleSignOut}
          style={[styles.signOutButton, isLoading && styles.disabledButton]}
        >
          <Text style={styles.signOutText}>
            {isLoading ? 'SIGNING OUT...' : 'SIGN OUT'}
          </Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>WHITE OAK RANCH</Text>
          <Text style={styles.footerText}>Operations Platform</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string;
  subtext: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statSubtext}>{subtext}</Text>
    </View>
  );
}

function AdminCard({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.adminCard} onPress={onPress}>
      <View style={styles.iconBox}>
        <Text style={styles.icon}>{icon}</Text>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>

      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
}

function IntegrationRow({ text }: { text: string }) {
  return (
    <View style={styles.integrationRow}>
      <Text style={styles.check}>✓</Text>
      <Text style={styles.integrationText}>{text}</Text>
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
    fontWeight: '800',
    marginTop: 3,
  },

  subtitle: {
    color: '#CCD4CD',
    fontSize: 13,
    marginTop: 4,
  },

  welcome: {
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 18,
  },

  welcomeTitle: {
    color: '#203B2A',
    fontSize: 25,
    fontWeight: '800',
  },

  welcomeText: {
    color: '#656963',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 7,
  },

  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    marginBottom: 20,
  },

  statCard: {
    width: '46%',
    margin: '2%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },

  statValue: {
    color: '#203B2A',
    fontSize: 24,
    fontWeight: '900',
  },

  statLabel: {
    color: '#203B2A',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 3,
  },

  statSubtext: {
    color: '#7A7D78',
    fontSize: 11,
    marginTop: 3,
  },

  sectionLabel: {
    color: '#787B76',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginHorizontal: 22,
    marginTop: 10,
    marginBottom: 10,
  },

  adminCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 18,
    marginBottom: 11,
    borderRadius: 16,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#EEF0E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
  },

  icon: {
    fontSize: 25,
  },

  cardBody: {
    flex: 1,
  },

  cardTitle: {
    color: '#203B2A',
    fontSize: 16,
    fontWeight: '800',
  },

  cardSubtitle: {
    color: '#747873',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },

  arrow: {
    color: '#9B8A68',
    fontSize: 28,
    marginLeft: 8,
  },

  integrationBox: {
    backgroundColor: '#203B2A',
    marginHorizontal: 18,
    marginTop: 22,
    borderRadius: 18,
    padding: 20,
  },

  integrationLabel: {
    color: '#D8C59D',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  integrationTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 6,
    marginBottom: 12,
  },

  integrationRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },

  check: {
    color: '#D8C59D',
    fontWeight: '900',
    marginRight: 8,
  },

  integrationText: {
    color: '#D6DDD7',
    fontSize: 13,
  },

  authError: {
    color: '#A13D35',
    fontSize: 13,
    lineHeight: 19,
    marginHorizontal: 22,
    marginTop: 14,
  },

  signOutButton: {
    alignItems: 'center',
    borderColor: '#C9B88F',
    borderRadius: 13,
    borderWidth: 1,
    marginHorizontal: 18,
    marginTop: 16,
    paddingVertical: 14,
  },

  signOutText: {
    color: '#203B2A',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  disabledButton: {
    opacity: 0.55,
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
