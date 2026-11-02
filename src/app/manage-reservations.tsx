import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  DEMO_RESERVATIONS,
  type ReservationRecord,
  type ReservationStatus,
} from '../data/reservationdata';
import { LIVE_RESERVATIONS_ENABLED } from '../constants/feature-flags';
import {
  listStaffReservations,
  type ReservationRepositoryError,
} from '../repositories/reservation-repository';

type SiteStatus = 'AVAILABLE' | 'RESERVED' | 'OCCUPIED';

type RVSite = {
  number: number;
  status: SiteStatus;
  service?: string;
};

const startingRVSites: RVSite[] = [
  { number: 1, status: 'OCCUPIED', service: 'Deluxe' },
  { number: 2, status: 'AVAILABLE' },
  { number: 3, status: 'RESERVED', service: 'Electric + Water' },
  { number: 4, status: 'OCCUPIED', service: 'Parking Only' },
  { number: 5, status: 'AVAILABLE' },
  { number: 6, status: 'AVAILABLE' },
  { number: 7, status: 'RESERVED', service: 'Deluxe' },
  { number: 8, status: 'AVAILABLE' },
  { number: 9, status: 'AVAILABLE' },
  { number: 10, status: 'AVAILABLE' },
  { number: 11, status: 'AVAILABLE' },
];

export default function ReservationsScreen() {
  const [rvSites, setRVSites] = useState(startingRVSites);
  const [liveReservations, setLiveReservations] = useState<ReservationRecord[]>(
    []
  );
  const [isLoadingLiveReservations, setIsLoadingLiveReservations] =
    useState(false);
  const [liveReservationError, setLiveReservationError] =
    useState<ReservationRepositoryError | null>(null);

  const loadLiveReservations = useCallback(async () => {
    if (!LIVE_RESERVATIONS_ENABLED) return;

    setIsLoadingLiveReservations(true);
    setLiveReservationError(null);

    const result = await listStaffReservations();
    setLiveReservations(result.reservations);
    setLiveReservationError(result.error);
    setIsLoadingLiveReservations(false);
  }, []);

  useEffect(() => {
    void loadLiveReservations();
  }, [loadLiveReservations]);

  const availableRV = rvSites.filter(
    (site) => site.status === 'AVAILABLE'
  ).length;

  function cycleSiteStatus(siteNumber: number) {
    setRVSites((current) =>
      current.map((site) => {
        if (site.number !== siteNumber) return site;

        if (site.status === 'AVAILABLE') {
          return {
            ...site,
            status: 'RESERVED',
            service: 'Deluxe',
          };
        }

        if (site.status === 'RESERVED') {
          return {
            ...site,
            status: 'OCCUPIED',
          };
        }

        return {
          number: site.number,
          status: 'AVAILABLE',
        };
      })
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
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
            <Text style={styles.title}>Live Staff Reservations</Text>
            <Text style={styles.subtitle}>
              Supabase read-only • staff access required
            </Text>
          </View>
        </View>

        <View style={styles.todayCard}>
          <View>
            <Text style={styles.todayLabel}>LEGACY DEMO SNAPSHOT</Text>
            <Text style={styles.todayTitle}>Operations preview</Text>
          </View>

          <Text style={styles.todayIcon}>🌲</Text>
        </View>

        <View style={styles.statsRow}>
          <StatCard value="3" label="Demo arrivals" />
          <StatCard value="2" label="Demo departures" />
          <StatCard value="17" label="Demo guests" />
        </View>

        <TouchableOpacity
          style={styles.newReservation}
          onPress={() => router.push('/new-reservation')}
        >
          <Text style={styles.newReservationIcon}>＋</Text>

          <View>
            <Text style={styles.newReservationTitle}>
              Demo New Reservation
            </Text>
            <Text style={styles.newReservationText}>
              Local-only • not written to Supabase
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionLabel}>DEMO INVENTORY SNAPSHOT</Text>
            <Text style={styles.sectionTitle}>11 RV Sites</Text>
          </View>

          <View style={styles.availableBadge}>
            <Text style={styles.availableBadgeText}>
              {availableRV} available
            </Text>
          </View>
        </View>

        <Text style={styles.demoControlLabel}>
          DEMO CONTROLS • NOT LIVE AVAILABILITY
        </Text>
        <Text style={styles.helperText}>
          Tap a site to cycle through Available → Reserved → Occupied.
        </Text>

        <View style={styles.siteGrid}>
          {rvSites.map((site) => (
            <TouchableOpacity
              key={site.number}
              style={[
                styles.siteCard,
                site.status === 'AVAILABLE' && styles.siteAvailable,
                site.status === 'RESERVED' && styles.siteReserved,
                site.status === 'OCCUPIED' && styles.siteOccupied,
              ]}
              onPress={() => cycleSiteStatus(site.number)}
            >
              <Text style={styles.siteNumber}>
                {String(site.number).padStart(2, '0')}
              </Text>

              <Text style={styles.siteStatus}>
                {site.status}
              </Text>

              {site.service ? (
                <Text style={styles.siteService}>
                  {site.service}
                </Text>
              ) : (
                <Text style={styles.siteService}>
                  No guest assigned
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionLabel}>OTHER INVENTORY</Text>
            <Text style={styles.sectionTitle}>Camping & Rentals</Text>
          </View>
        </View>

        <InventoryCard
          icon="⛺"
          title="Tent Sites"
          subtitle="10 total campsites"
          available="7"
          total="10"
        />

        <InventoryCard
          icon="🚐"
          title="Small Rental RV"
          subtitle="Sleeps 4–5"
          status="OCCUPIED"
        />

        <InventoryCard
          icon="🚍"
          title="Large Rental RV"
          subtitle="Sleeps 6–8"
          status="AVAILABLE"
        />

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionLabel}>LIVE STAFF DATA</Text>
            <Text style={styles.sectionTitle}>Supabase Reservations</Text>
          </View>
        </View>

        {LIVE_RESERVATIONS_ENABLED && isLoadingLiveReservations ? (
          <ReservationStateCard text="Loading live reservations..." />
        ) : LIVE_RESERVATIONS_ENABLED && liveReservationError ? (
          <ReservationStateCard
            text={
              liveReservationError === 'permission'
                ? 'Your staff account cannot view live reservations.'
                : 'Live reservations are temporarily unavailable.'
            }
            onRetry={() => void loadLiveReservations()}
          />
        ) : LIVE_RESERVATIONS_ENABLED && liveReservations.length === 0 ? (
          <ReservationStateCard text="No live reservations found." />
        ) : (
          (LIVE_RESERVATIONS_ENABLED
            ? liveReservations
            : DEMO_RESERVATIONS
          ).map((reservation) => (
  <ReservationCard
  key={reservation.id}
  guest={reservation.guestName}
  dates={`${reservation.arrival} - ${reservation.departure}`}
  stay={reservation.stayType ?? reservation.unit}
  detail={
    reservation.rvService
      ? `${reservation.unit} • ${reservation.rvService}`
      : reservation.unit
  }
  status={
    reservation.status
  }
  phone={reservation.phone}
  guests={reservation.guests}
  atvAccess={reservation.atvAccess}
  total={reservation.total}
/>
          ))
        )}

        <View style={styles.serviceCard}>
          <Text style={styles.serviceLabel}>RV SERVICE LEVELS</Text>
          <Text style={styles.serviceTitle}>
            One site. Three service options.
          </Text>

          <ServiceRow
            title="Parking Only"
            price="$25/day"
            description="RV site without utility hookups"
          />

          <ServiceRow
            title="Electric + Water"
            price="$40/day"
            description="Electric and water access"
          />

          <ServiceRow
            title="Deluxe"
            price="$50/day"
            description="Water, electric, septic & high-speed internet"
          />

          <Text style={styles.serviceNote}>
            All 11 RV sites are physically capable of full hookups.
            Purchased utilities determine which services are unlocked
            for each reservation.
          </Text>
        </View>

        <View style={styles.futureCard}>
          <Text style={styles.futureLabel}>READ-ONLY MILESTONE</Text>
          <Text style={styles.futureTitle}>
            Live staff listing is connected.
          </Text>

          <Text style={styles.futureText}>
            Reservation creation remains demo-only in this milestone. Pricing,
            customer booking, inventory controls and reservation writes remain
            unchanged.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>WHITE OAK RANCH</Text>
          <Text style={styles.footerText}>
            Reservation Operations
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ReservationStateCard({
  text,
  onRetry,
}: {
  text: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.reservationStateCard}>
      <Text style={styles.reservationStateText}>{text}</Text>
      {onRetry && (
        <TouchableOpacity
          onPress={onRetry}
          style={styles.reservationRetryButton}
        >
          <Text style={styles.reservationRetryText}>TRY AGAIN</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function StatCard({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function InventoryCard({
  icon,
  title,
  subtitle,
  available,
  total,
  status,
}: {
  icon: string;
  title: string;
  subtitle: string;
  available?: string;
  total?: string;
  status?: SiteStatus;
}) {
  return (
    <View style={styles.inventoryCard}>
      <View style={styles.inventoryIcon}>
        <Text style={styles.inventoryEmoji}>{icon}</Text>
      </View>

      <View style={styles.inventoryInfo}>
        <Text style={styles.inventoryTitle}>{title}</Text>
        <Text style={styles.inventorySubtitle}>{subtitle}</Text>
      </View>

      {available && total ? (
        <View style={styles.inventoryCount}>
          <Text style={styles.inventoryCountValue}>
            {available}/{total}
          </Text>
          <Text style={styles.inventoryCountLabel}>Available</Text>
        </View>
      ) : (
        <View
          style={[
            styles.inventoryStatus,
            status === 'AVAILABLE'
              ? styles.inventoryStatusAvailable
              : styles.inventoryStatusOccupied,
          ]}
        >
          <Text style={styles.inventoryStatusText}>{status}</Text>
        </View>
      )}
    </View>
  );
}

function ReservationCard({
  guest,
  dates,
  stay,
  detail,
  status,
  phone,
  guests,
  atvAccess,
  total,
}: {
  guest: string;
  dates: string;
  stay: string;
  detail: string;
  status: ReservationStatus;
  phone?: string;
  guests?: number;
  atvAccess?: boolean;
  total?: number;
}) {
  return (
    <TouchableOpacity
      style={styles.reservationCard}
      onPress={() =>
  Alert.alert(
    guest,
    [
      dates,
      stay,
      detail,
      guests !== undefined ? `${guests} guest${guests === 1 ? '' : 's'}` : null,
      phone ? `Phone: ${phone}` : null,
      atvAccess ? 'ATV / SxS Access: Yes' : null,
      total !== undefined ? `Total: $${total}` : null,
      `Status: ${status}`,
    ]
      .filter(Boolean)
      .join('\n')
  )
}
    >
      <View style={styles.reservationTop}>
        <View style={styles.reservationInfo}>
          <Text style={styles.guestName}>{guest}</Text>
          <Text style={styles.reservationDates}>{dates}</Text>
        </View>

        <View
          style={[
            styles.reservationBadge,
            status === 'CONFIRMED'
              ? styles.confirmedBadge
              : styles.pendingBadge,
          ]}
        >
          <Text style={styles.reservationBadgeText}>{status}</Text>
        </View>
      </View>

      <View style={styles.reservationBottom}>
  <View style={styles.reservationDetailsLeft}>
    <Text style={styles.reservationStay}>{stay}</Text>
    <Text style={styles.reservationDetail}>{detail}</Text>

    {guests !== undefined && (
      <Text style={styles.reservationDetail}>
        {guests} guest{guests === 1 ? '' : 's'}
      </Text>
    )}

    {phone && (
      <Text style={styles.reservationDetail}>
        {phone}
      </Text>
    )}

    {atvAccess && (
      <Text style={styles.reservationDetail}>
        ATV / SxS Access
      </Text>
    )}
  </View>

  {total !== undefined && (
    <Text style={styles.reservationTotal}>
      ${total}
    </Text>
  )}
</View>

    </TouchableOpacity>
  );
}

function ServiceRow({
  title,
  price,
  description,
}: {
  title: string;
  price: string;
  description: string;
}) {
  return (
    <View style={styles.serviceRow}>
      <View style={styles.serviceInfo}>
        <Text style={styles.serviceName}>{title}</Text>
        <Text style={styles.serviceDescription}>{description}</Text>
      </View>

      <Text style={styles.servicePrice}>{price}</Text>
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
    fontSize: 29,
    fontWeight: '900',
    marginTop: 3,
  },

  subtitle: {
    color: '#CCD4CD',
    fontSize: 13,
    marginTop: 4,
  },

  todayCard: {
    marginHorizontal: 18,
    marginTop: 18,
    backgroundColor: '#EAE6DA',
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  todayLabel: {
    color: '#9B7952',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  todayTitle: {
    color: '#203B2A',
    fontSize: 21,
    fontWeight: '900',
    marginTop: 4,
  },

  todayIcon: {
    fontSize: 34,
  },

  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 14,
    marginTop: 10,
  },

  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: 'center',
    marginHorizontal: 4,
  },

  statValue: {
    color: '#203B2A',
    fontSize: 22,
    fontWeight: '900',
  },

  statLabel: {
    color: '#7A7E78',
    fontSize: 10,
    marginTop: 2,
  },

  newReservation: {
    marginHorizontal: 18,
    marginTop: 16,
    backgroundColor: '#203B2A',
    borderRadius: 18,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
  },

  newReservationIcon: {
    color: '#D8C59D',
    fontSize: 31,
    marginRight: 13,
  },

  newReservationTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },

  newReservationText: {
    color: '#CCD4CD',
    fontSize: 11,
    marginTop: 2,
  },

  sectionHeader: {
    marginHorizontal: 20,
    marginTop: 28,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },

  sectionLabel: {
    color: '#9B7952',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  sectionTitle: {
    color: '#203B2A',
    fontSize: 21,
    fontWeight: '900',
    marginTop: 3,
  },

  availableBadge: {
    backgroundColor: '#DCE9DF',
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },

  availableBadgeText: {
    color: '#31523A',
    fontSize: 10,
    fontWeight: '900',
  },

  helperText: {
    marginHorizontal: 20,
    color: '#7D817C',
    fontSize: 10,
    marginBottom: 10,
  },

  demoControlLabel: {
    color: '#9B7952',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginHorizontal: 20,
    marginTop: 2,
    marginBottom: 4,
  },

  siteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
  },

  siteCard: {
    width: '30.33%',
    minHeight: 108,
    borderRadius: 16,
    padding: 12,
    margin: '1.5%',
  },

  siteAvailable: {
    backgroundColor: '#E2EDE4',
  },

  siteReserved: {
    backgroundColor: '#EFE2C9',
  },

  siteOccupied: {
    backgroundColor: '#D8DDD8',
  },

  siteNumber: {
    color: '#203B2A',
    fontSize: 23,
    fontWeight: '900',
  },

  siteStatus: {
    color: '#526056',
    fontSize: 8,
    fontWeight: '900',
    marginTop: 5,
  },

  siteService: {
    color: '#747A74',
    fontSize: 8,
    marginTop: 6,
  },

  inventoryCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 18,
    marginBottom: 9,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  inventoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#F0EDE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  inventoryEmoji: {
    fontSize: 21,
  },

  inventoryInfo: {
    flex: 1,
  },

  inventoryTitle: {
    color: '#203B2A',
    fontSize: 14,
    fontWeight: '900',
  },

  inventorySubtitle: {
    color: '#7B7F7A',
    fontSize: 10,
    marginTop: 2,
  },

  inventoryCount: {
    alignItems: 'center',
  },

  inventoryCountValue: {
    color: '#203B2A',
    fontSize: 17,
    fontWeight: '900',
  },

  inventoryCountLabel: {
    color: '#7B7F7A',
    fontSize: 8,
  },

  inventoryStatus: {
    borderRadius: 15,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  inventoryStatusAvailable: {
    backgroundColor: '#E2EDE4',
  },

  inventoryStatusOccupied: {
    backgroundColor: '#E2E2DE',
  },

  inventoryStatusText: {
    color: '#31523A',
    fontSize: 8,
    fontWeight: '900',
  },

  reservationCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 18,
    marginBottom: 10,
    borderRadius: 16,
    padding: 15,
  },

  reservationStateCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 18,
    marginBottom: 10,
    padding: 20,
  },

  reservationStateText: {
    color: '#59625B',
    fontSize: 12,
    textAlign: 'center',
  },

  reservationRetryButton: {
    backgroundColor: '#203B2A',
    borderRadius: 12,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  reservationRetryText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.1,
  },

  reservationTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  reservationInfo: {
    flex: 1,
  },

  guestName: {
    color: '#203B2A',
    fontSize: 15,
    fontWeight: '900',
  },

  reservationDates: {
    color: '#9B7952',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 3,
  },

  reservationBadge: {
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },

  confirmedBadge: {
    backgroundColor: '#E2EDE4',
  },

  pendingBadge: {
    backgroundColor: '#EFE2C9',
  },

  reservationBadgeText: {
    color: '#31523A',
    fontSize: 8,
    fontWeight: '900',
  },

  reservationBottom: {
    borderTopWidth: 1,
    borderTopColor: '#EEEAE2',
    marginTop: 11,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  reservationDetailsLeft: {
    flex: 1,
    gap: 3,
  },

  reservationStay: {
    color: '#4C554E',
    fontSize: 11,
    fontWeight: '800',
  },

  reservationDetail: {
    color: '#7C807B',
    fontSize: 10,
  },
reservationTotal: {
  color: '#203B2A',
  fontSize: 14,
  fontWeight: '800',
  marginTop: 7,
},
  serviceCard: {
    backgroundColor: '#EAE6DA',
    marginHorizontal: 18,
    marginTop: 20,
    borderRadius: 18,
    padding: 19,
  },

  serviceLabel: {
    color: '#9B7952',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  serviceTitle: {
    color: '#203B2A',
    fontSize: 19,
    fontWeight: '900',
    marginTop: 4,
    marginBottom: 12,
  },

  serviceRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#D8D1C2',
    paddingVertical: 11,
  },

  serviceInfo: {
    flex: 1,
    paddingRight: 10,
  },

  serviceName: {
    color: '#203B2A',
    fontSize: 12,
    fontWeight: '900',
  },

  serviceDescription: {
    color: '#73776F',
    fontSize: 9,
    marginTop: 2,
  },

  servicePrice: {
    color: '#203B2A',
    fontSize: 12,
    fontWeight: '900',
  },

  serviceNote: {
    color: '#676C65',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 8,
  },

  futureCard: {
    marginHorizontal: 18,
    marginTop: 16,
    backgroundColor: '#203B2A',
    borderRadius: 18,
    padding: 19,
  },

  futureLabel: {
    color: '#D8C59D',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  futureTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    marginTop: 5,
  },

  futureText: {
    color: '#D4DDD5',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 7,
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
