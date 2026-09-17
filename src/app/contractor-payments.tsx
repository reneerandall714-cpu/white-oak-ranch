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

type Contractor = {
  id: string;
  name: string;
  hours: number;
  rate: number;
  status: 'READY' | 'REVIEW';
};

const contractors: Contractor[] = [
  {
    id: '1',
    name: 'Renee',
    hours: 86.5,
    rate: 20,
    status: 'READY',
  },
  {
    id: '2',
    name: 'Jake',
    hours: 74,
    rate: 18,
    status: 'READY',
  },
  {
    id: '3',
    name: 'Sarah',
    hours: 63.5,
    rate: 17,
    status: 'READY',
  },
  {
    id: '4',
    name: 'Mike',
    hours: 42,
    rate: 19,
    status: 'REVIEW',
  },
];

export default function ContractorPaymentsScreen() {
  const [approved, setApproved] = useState(false);

  const totalHours = contractors.reduce(
    (sum, contractor) => sum + contractor.hours,
    0
  );

  const totalPay = contractors.reduce(
    (sum, contractor) => sum + contractor.hours * contractor.rate,
    0
  );

  function approveBatch() {
    Alert.alert(
      'Approve Payment Batch?',
      'Demo mode only. In the live system, this would lock the pay period and prepare approved contractor payments.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Approve',
          onPress: () => setApproved(true),
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
            <Text style={styles.title}>Contractor Payments</Text>
            <Text style={styles.subtitle}>Hours, rates & payment review</Text>
          </View>
        </View>

        <View style={styles.periodCard}>
          <Text style={styles.periodLabel}>CURRENT PAY PERIOD</Text>
          <Text style={styles.periodTitle}>September 1 – September 15</Text>

          <View style={styles.periodStats}>
            <View>
              <Text style={styles.statValue}>{totalHours.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Total Hours</Text>
            </View>

            <View style={styles.statDivider} />

            <View>
              <Text style={styles.statValue}>
                ${totalPay.toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Amount Due</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Contractors</Text>
          <Text style={styles.sectionCount}>
            {contractors.length} people
          </Text>
        </View>

        {contractors.map((contractor) => (
          <ContractorCard
            key={contractor.id}
            name={contractor.name}
            hours={contractor.hours}
            rate={contractor.rate}
            status={contractor.status}
          />
        ))}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>PAYMENT SUMMARY</Text>

          <SummaryRow
            label="Contractor Hours"
            value={`${totalHours.toFixed(1)} hrs`}
          />

          <SummaryRow
            label="Contractor Compensation"
            value={`$${totalPay.toLocaleString()}`}
          />

          <SummaryRow
            label="Payment Method"
            value="Checks / Future ACH"
          />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Payment Batch</Text>
            <Text style={styles.totalValue}>
              ${totalPay.toLocaleString()}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.approveButton,
              approved && styles.approvedButton,
            ]}
            onPress={approveBatch}
            disabled={approved}
          >
            <Text style={styles.approveButtonText}>
              {approved ? '✓ PAYMENT BATCH APPROVED' : 'APPROVE PAYMENT BATCH'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.workflowBox}>
          <Text style={styles.workflowLabel}>FUTURE WORKFLOW</Text>
          <Text style={styles.workflowTitle}>From hours to payment</Text>

          <WorkflowRow text="Contractor clocks in and out" />
          <WorkflowRow text="Hours submitted for review" />
          <WorkflowRow text="Manager approves time" />
          <WorkflowRow text="Compensation calculated automatically" />
          <WorkflowRow text="Payment batch approved" />
          <WorkflowRow text="ACH or check payment recorded" />
          <WorkflowRow text="Transaction sent to QuickBooks" />
        </View>

        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>Accounting permissions</Text>
          <Text style={styles.warningText}>
            In the live system, only approved accounting or administrator roles
            should be allowed to view rates or authorize payments.
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

function ContractorCard({
  name,
  hours,
  rate,
  status,
}: {
  name: string;
  hours: number;
  rate: number;
  status: 'READY' | 'REVIEW';
}) {
  const amount = hours * rate;

  return (
    <View style={styles.contractorCard}>
      <View style={styles.contractorTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name.charAt(0)}</Text>
        </View>

        <View style={styles.contractorInfo}>
          <Text style={styles.contractorName}>{name}</Text>
          <Text style={styles.contractorMeta}>
            {hours.toFixed(1)} hrs × ${rate}/hr
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            status === 'READY'
              ? styles.readyBadge
              : styles.reviewBadge,
          ]}
        >
          <Text style={styles.statusText}>{status}</Text>
        </View>
      </View>

      <View style={styles.contractorBottom}>
        <Text style={styles.amountLabel}>AMOUNT DUE</Text>
        <Text style={styles.amountValue}>
          ${amount.toLocaleString()}
        </Text>
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

function WorkflowRow({ text }: { text: string }) {
  return (
    <View style={styles.workflowRow}>
      <Text style={styles.check}>✓</Text>
      <Text style={styles.workflowText}>{text}</Text>
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

  periodCard: {
    marginHorizontal: 18,
    marginTop: 20,
    backgroundColor: '#203B2A',
    borderRadius: 18,
    padding: 20,
  },

  periodLabel: {
    color: '#D8C59D',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  periodTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '900',
    marginTop: 5,
  },

  periodStats: {
    flexDirection: 'row',
    marginTop: 18,
    alignItems: 'center',
  },

  statValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },

  statLabel: {
    color: '#C7CEC8',
    fontSize: 11,
    marginTop: 3,
  },

  statDivider: {
    width: 1,
    height: 45,
    backgroundColor: '#58705E',
    marginHorizontal: 28,
  },

  sectionHeader: {
    marginHorizontal: 20,
    marginTop: 24,
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

  contractorCard: {
    marginHorizontal: 18,
    marginBottom: 11,
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 16,
  },

  contractorTop: {
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

  contractorInfo: {
    flex: 1,
  },

  contractorName: {
    color: '#203B2A',
    fontSize: 16,
    fontWeight: '900',
  },

  contractorMeta: {
    color: '#777B76',
    fontSize: 12,
    marginTop: 3,
  },

  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  readyBadge: {
    backgroundColor: '#E5EEE7',
  },

  reviewBadge: {
    backgroundColor: '#F2E7DD',
  },

  statusText: {
    color: '#203B2A',
    fontSize: 9,
    fontWeight: '900',
  },

  contractorBottom: {
    borderTopWidth: 1,
    borderTopColor: '#ECE9E1',
    marginTop: 13,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  amountLabel: {
    color: '#898C87',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },

  amountValue: {
    color: '#9B7952',
    fontSize: 18,
    fontWeight: '900',
  },

  summaryCard: {
    marginHorizontal: 18,
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
  },

  summaryLabel: {
    color: '#9B7952',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.3,
    marginBottom: 12,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
  },

  summaryRowLabel: {
    color: '#717570',
    fontSize: 13,
  },

  summaryRowValue: {
    color: '#203B2A',
    fontSize: 13,
    fontWeight: '800',
  },

  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E1D8',
    marginTop: 10,
    paddingTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  totalLabel: {
    color: '#203B2A',
    fontSize: 16,
    fontWeight: '900',
  },

  totalValue: {
    color: '#9B7952',
    fontSize: 21,
    fontWeight: '900',
  },

  approveButton: {
    marginTop: 18,
    backgroundColor: '#203B2A',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },

  approvedButton: {
    backgroundColor: '#58705E',
  },

  approveButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },

  workflowBox: {
    marginHorizontal: 18,
    marginTop: 18,
    backgroundColor: '#EAE6DA',
    borderRadius: 18,
    padding: 20,
  },

  workflowLabel: {
    color: '#9B7952',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.3,
  },

  workflowTitle: {
    color: '#203B2A',
    fontSize: 19,
    fontWeight: '900',
    marginTop: 5,
    marginBottom: 12,
  },

  workflowRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },

  check: {
    color: '#203B2A',
    fontWeight: '900',
    marginRight: 8,
  },

  workflowText: {
    color: '#626660',
    fontSize: 13,
  },

  warningBox: {
    marginHorizontal: 18,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#D7D1C3',
    borderRadius: 16,
    padding: 17,
  },

  warningTitle: {
    color: '#203B2A',
    fontSize: 15,
    fontWeight: '900',
  },

  warningText: {
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