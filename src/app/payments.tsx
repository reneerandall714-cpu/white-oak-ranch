import { router } from 'expo-router';
import { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type PaymentFilter = 'all' | 'paid' | 'pending';

const payments = [
  {
    id: '1',
    customer: 'James Carter',
    type: 'RV Reservation',
    amount: 150,
    status: 'PAID',
    date: 'Sep 16',
  },
  {
    id: '2',
    customer: 'Amanda Lewis',
    type: 'Day Pass + ATV/SxS',
    amount: 65,
    status: 'PAID',
    date: 'Sep 16',
  },
  {
    id: '3',
    customer: 'Demo Guest',
    type: 'Annual Membership',
    amount: 145,
    status: 'PAID',
    date: 'Sep 15',
  },
  {
    id: '4',
    customer: 'Chris Walker',
    type: 'RV Reservation',
    amount: 100,
    status: 'PENDING',
    date: 'Sep 20',
  },
  {
    id: '5',
    customer: 'Megan Hall',
    type: 'Tent Camping',
    amount: 50,
    status: 'PAID',
    date: 'Sep 14',
  },
];

export default function PaymentsScreen() {
  const [filter, setFilter] = useState<PaymentFilter>('all');

  const filtered = payments.filter((payment) => {
    if (filter === 'all') return true;
    return payment.status.toLowerCase() === filter;
  });

  const totalPaid = payments
    .filter((payment) => payment.status === 'PAID')
    .reduce((sum, payment) => sum + payment.amount, 0);

  const totalPending = payments
    .filter((payment) => payment.status === 'PENDING')
    .reduce((sum, payment) => sum + payment.amount, 0);

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
            <Text style={styles.title}>Payments</Text>
            <Text style={styles.subtitle}>Revenue & transaction status</Text>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <SummaryCard
            label="Collected"
            value={`$${totalPaid.toLocaleString()}`}
          />

          <SummaryCard
            label="Pending"
            value={`$${totalPending.toLocaleString()}`}
          />

          <SummaryCard
            label="Transactions"
            value={payments.length.toString()}
          />

          <SummaryCard
            label="Refunds"
            value="$0"
          />
        </View>

        <View style={styles.filterRow}>
          <FilterButton
            label="All"
            selected={filter === 'all'}
            onPress={() => setFilter('all')}
          />

          <FilterButton
            label="Paid"
            selected={filter === 'paid'}
            onPress={() => setFilter('paid')}
          />

          <FilterButton
            label="Pending"
            selected={filter === 'pending'}
            onPress={() => setFilter('pending')}
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Transactions</Text>
          <Text style={styles.sectionCount}>
            {filtered.length} shown
          </Text>
        </View>

        {filtered.map((payment) => (
          <PaymentCard
            key={payment.id}
            customer={payment.customer}
            type={payment.type}
            amount={payment.amount}
            status={payment.status}
            date={payment.date}
          />
        ))}

        <View style={styles.integrationBox}>
          <Text style={styles.integrationLabel}>PAYMENT FLOW</Text>
          <Text style={styles.integrationTitle}>
            Customer payments in one place
          </Text>

          <FlowRow text="Reservation payments" />
          <FlowRow text="Day passes" />
          <FlowRow text="Membership purchases and renewals" />
          <FlowRow text="Event registration" />
          <FlowRow text="ATV / SxS access fees" />
          <FlowRow text="Refund tracking" />
          <FlowRow text="QuickBooks accounting sync" />
        </View>

        <View style={styles.noteBox}>
          <Text style={styles.noteTitle}>Planned live payment system</Text>
          <Text style={styles.noteText}>
            The production app can connect to a secure payment provider for
            card payments, receipts, refunds and transaction status. Card
            details should not be stored directly in the White Oak Ranch
            database.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>WHITE OAK RANCH</Text>
          <Text style={styles.footerText}>Accounting & Operations</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function FilterButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selected && styles.filterButtonSelected,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterButtonText,
          selected && styles.filterButtonTextSelected,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function PaymentCard({
  customer,
  type,
  amount,
  status,
  date,
}: {
  customer: string;
  type: string;
  amount: number;
  status: string;
  date: string;
}) {
  return (
    <TouchableOpacity style={styles.card}>
      <View style={styles.cardTop}>
        <View>
          <Text style={styles.customer}>{customer}</Text>
          <Text style={styles.type}>{type}</Text>
        </View>

        <Text style={styles.amount}>
          ${amount.toLocaleString()}
        </Text>
      </View>

      <View style={styles.cardBottom}>
        <Text style={styles.date}>{date}</Text>

        <View
          style={[
            styles.statusBadge,
            status === 'PAID'
              ? styles.paidBadge
              : styles.pendingBadge,
          ]}
        >
          <Text style={styles.statusText}>{status}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function FlowRow({ text }: { text: string }) {
  return (
    <View style={styles.flowRow}>
      <Text style={styles.check}>✓</Text>
      <Text style={styles.flowText}>{text}</Text>
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

  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    marginTop: 18,
  },

  summaryCard: {
    width: '46%',
    margin: '2%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },

  summaryValue: {
    color: '#203B2A',
    fontSize: 24,
    fontWeight: '900',
  },

  summaryLabel: {
    color: '#737772',
    fontSize: 12,
    marginTop: 4,
  },

  filterRow: {
    flexDirection: 'row',
    marginHorizontal: 18,
    marginTop: 10,
    marginBottom: 20,
  },

  filterButton: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: '#E7E3D9',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },

  filterButtonSelected: {
    backgroundColor: '#203B2A',
  },

  filterButtonText: {
    color: '#696D68',
    fontSize: 12,
    fontWeight: '800',
  },

  filterButtonTextSelected: {
    color: '#FFFFFF',
  },

  sectionHeader: {
    marginHorizontal: 20,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },

  sectionTitle: {
    color: '#203B2A',
    fontSize: 21,
    fontWeight: '900',
  },

  sectionCount: {
    color: '#858984',
    fontSize: 11,
  },

  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 18,
    marginBottom: 11,
    borderRadius: 16,
    padding: 16,
  },

  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  customer: {
    color: '#203B2A',
    fontSize: 16,
    fontWeight: '900',
  },

  type: {
    color: '#777B76',
    fontSize: 12,
    marginTop: 3,
  },

  amount: {
    color: '#9B7952',
    fontSize: 18,
    fontWeight: '900',
  },

  cardBottom: {
    borderTopWidth: 1,
    borderTopColor: '#ECE9E1',
    marginTop: 13,
    paddingTop: 11,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  date: {
    color: '#888B86',
    fontSize: 11,
  },

  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  paidBadge: {
    backgroundColor: '#E5EEE7',
  },

  pendingBadge: {
    backgroundColor: '#F2E7DD',
  },

  statusText: {
    color: '#203B2A',
    fontSize: 9,
    fontWeight: '900',
  },

  integrationBox: {
    marginHorizontal: 18,
    marginTop: 18,
    backgroundColor: '#203B2A',
    borderRadius: 18,
    padding: 20,
  },

  integrationLabel: {
    color: '#D8C59D',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.3,
  },

  integrationTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    marginTop: 5,
    marginBottom: 12,
  },

  flowRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },

  check: {
    color: '#D8C59D',
    fontWeight: '900',
    marginRight: 8,
  },

  flowText: {
    color: '#D6DDD7',
    fontSize: 13,
  },

  noteBox: {
    marginHorizontal: 18,
    marginTop: 14,
    backgroundColor: '#EAE6DA',
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