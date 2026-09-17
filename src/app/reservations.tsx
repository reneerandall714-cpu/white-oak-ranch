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

type FilterType = 'today' | 'current' | 'upcoming';

const reservations = [
  {
    id: '1',
    guest: 'James Carter',
    type: 'RV Site',
    site: 'RV-03',
    package: 'Deluxe',
    dates: 'Sep 16–19',
    status: 'ARRIVING',
    payment: 'PAID',
  },
  {
    id: '2',
    guest: 'Amanda Lewis',
    type: 'Tent Camping',
    site: 'Tent-07',
    package: '2 adults + 3 children',
    dates: 'Sep 16–17',
    status: 'ARRIVING',
    payment: 'PAID',
  },
  {
    id: '3',
    guest: 'Daniel Brooks',
    type: 'Rental RV',
    site: 'Rental RV • Sleeps 6–8',
    package: 'Standard Rate',
    dates: 'Sep 14–17',
    status: 'CURRENT',
    payment: 'PAID',
  },
  {
    id: '4',
    guest: 'Megan Hall',
    type: 'RV Site',
    site: 'RV-08',
    package: 'Electric + Water',
    dates: 'Sep 13–16',
    status: 'DEPARTING',
    payment: 'PAID',
  },
  {
    id: '5',
    guest: 'Chris Walker',
    type: 'RV Site',
    site: 'RV-10',
    package: 'Parking Only',
    dates: 'Sep 20–22',
    status: 'UPCOMING',
    payment: 'PENDING',
  },
];

export default function ReservationsScreen() {
  const [filter, setFilter] = useState<FilterType>('today');

  const filteredReservations = reservations.filter((reservation) => {
    if (filter === 'today') {
      return ['ARRIVING', 'DEPARTING'].includes(reservation.status);
    }

    if (filter === 'current') {
      return reservation.status === 'CURRENT';
    }

    return reservation.status === 'UPCOMING';
  });

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
            <Text style={styles.title}>Reservations</Text>
            <Text style={styles.subtitle}>Guest stays & site assignments</Text>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <SummaryCard label="Arrivals" value="2" />
          <SummaryCard label="Current Stays" value="1" />
          <SummaryCard label="Departures" value="1" />
          <SummaryCard label="Upcoming" value="1" />
        </View>

        <View style={styles.filterRow}>
          <FilterButton
            label="Today"
            selected={filter === 'today'}
            onPress={() => setFilter('today')}
          />

          <FilterButton
            label="Current"
            selected={filter === 'current'}
            onPress={() => setFilter('current')}
          />

          <FilterButton
            label="Upcoming"
            selected={filter === 'upcoming'}
            onPress={() => setFilter('upcoming')}
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {filter === 'today' && 'Today'}
            {filter === 'current' && 'Current Guests'}
            {filter === 'upcoming' && 'Upcoming Reservations'}
          </Text>

          <Text style={styles.sectionCount}>
            {filteredReservations.length} reservation
            {filteredReservations.length === 1 ? '' : 's'}
          </Text>
        </View>

        {filteredReservations.map((reservation) => (
          <ReservationCard
            key={reservation.id}
            guest={reservation.guest}
            type={reservation.type}
            site={reservation.site}
            packageName={reservation.package}
            dates={reservation.dates}
            status={reservation.status}
            payment={reservation.payment}
          />
        ))}

        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Add Manual Reservation</Text>
        </TouchableOpacity>

        <View style={styles.noteBox}>
          <Text style={styles.noteTitle}>Future live system</Text>
          <Text style={styles.noteText}>
            Reservations will eventually pull directly from the booking database,
            including guest details, payments, site availability and gate access.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>WHITE OAK RANCH</Text>
          <Text style={styles.footerText}>Staff Operations</Text>
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

function ReservationCard({
  guest,
  type,
  site,
  packageName,
  dates,
  status,
  payment,
}: {
  guest: string;
  type: string;
  site: string;
  packageName: string;
  dates: string;
  status: string;
  payment: string;
}) {
  return (
    <TouchableOpacity style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardMain}>
          <Text style={styles.guestName}>{guest}</Text>
          <Text style={styles.bookingType}>{type}</Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            status === 'ARRIVING' && styles.arrivingBadge,
            status === 'DEPARTING' && styles.departingBadge,
            status === 'CURRENT' && styles.currentBadge,
          ]}
        >
          <Text style={styles.statusText}>{status}</Text>
        </View>
      </View>

      <View style={styles.detailSection}>
        <DetailRow label="Site" value={site} />
        <DetailRow label="Package" value={packageName} />
        <DetailRow label="Dates" value={dates} />
      </View>

      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.paymentLabel}>PAYMENT</Text>
          <Text
            style={[
              styles.paymentValue,
              payment === 'PAID'
                ? styles.paymentPaid
                : styles.paymentPending,
            ]}
          >
            {payment}
          </Text>
        </View>

        <Text style={styles.viewText}>View Details ›</Text>
      </View>
    </TouchableOpacity>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
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
    fontSize: 25,
    fontWeight: '900',
  },

  summaryLabel: {
    color: '#6F736D',
    fontSize: 12,
    marginTop: 3,
  },

  filterRow: {
    flexDirection: 'row',
    marginHorizontal: 18,
    marginTop: 8,
    marginBottom: 20,
  },

  filterButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: '#E7E3D9',
  },

  filterButtonSelected: {
    backgroundColor: '#203B2A',
  },

  filterButtonText: {
    color: '#6B6E69',
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
    marginHorizontal: 18,
    marginBottom: 13,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
  },

  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  cardMain: {
    flex: 1,
    paddingRight: 10,
  },

  guestName: {
    color: '#203B2A',
    fontSize: 18,
    fontWeight: '900',
  },

  bookingType: {
    color: '#757974',
    fontSize: 12,
    marginTop: 3,
  },

  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: '#E6E2D8',
    alignSelf: 'flex-start',
  },

  arrivingBadge: {
    backgroundColor: '#E5EEE7',
  },

  departingBadge: {
    backgroundColor: '#F2E7DD',
  },

  currentBadge: {
    backgroundColor: '#E1E9F0',
  },

  statusText: {
    color: '#203B2A',
    fontSize: 9,
    fontWeight: '900',
  },

  detailSection: {
    borderTopWidth: 1,
    borderTopColor: '#ECE9E1',
    marginTop: 14,
    paddingTop: 10,
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },

  detailLabel: {
    color: '#777B76',
    fontSize: 12,
  },

  detailValue: {
    color: '#203B2A',
    fontSize: 12,
    fontWeight: '800',
    maxWidth: '65%',
    textAlign: 'right',
  },

  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#ECE9E1',
    marginTop: 10,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  paymentLabel: {
    color: '#898C87',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },

  paymentValue: {
    fontSize: 12,
    fontWeight: '900',
    marginTop: 2,
  },

  paymentPaid: {
    color: '#4C7256',
  },

  paymentPending: {
    color: '#A16E45',
  },

  viewText: {
    color: '#9B7952',
    fontSize: 12,
    fontWeight: '800',
  },

  addButton: {
    marginHorizontal: 18,
    marginTop: 7,
    backgroundColor: '#203B2A',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },

  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },

  noteBox: {
    marginHorizontal: 18,
    marginTop: 16,
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
    color: '#666A64',
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