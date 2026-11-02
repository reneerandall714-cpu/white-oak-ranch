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
import { RANCH_CONFIG } from '../data/ranchConfig';

type StayType = 'rv-site' | 'tent' | 'small-rv' | 'large-rv' | null;

export default function BookingScreen() {
  const [selectedStay, setSelectedStay] = useState<StayType>(null);
  const [rvPackage, setRvPackage] = useState<string | null>(null);

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

          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>WHITE OAK RANCH</Text>
            <Text style={styles.title}>Book Your Stay</Text>
            <Text style={styles.headerSubtitle}>Dunlap, Tennessee</Text>
          </View>
        </View>

        <View style={styles.intro}>
          <Text style={styles.introTitle}>Find your place at the ranch.</Text>

          <Text style={styles.introText}>
            Choose your stay below. Live dates, availability and checkout will
            be connected next.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>ACCOMMODATIONS</Text>

        <StayCard
          icon="🚐"
          title="RV Site"
          description="11 deluxe-capable RV sites"
          price="From $25/night"
          selected={selectedStay === 'rv-site'}
          onPress={() => {
            setSelectedStay('rv-site');
            setRvPackage(null);
          }}
        />

        {selectedStay === 'rv-site' && (
          <View style={styles.packageSection}>
            <Text style={styles.packageHeading}>Choose your RV package</Text>
            <Text style={styles.packageSubheading}>
              All 11 sites are deluxe-capable. Staff enables the services
              included with your reservation.
            </Text>

            <PackageCard
              title="Parking Only"
              price={`$${RANCH_CONFIG.pricing.rv.parkingOnly.nightly}/night`}
              weekly={`$${RANCH_CONFIG.pricing.rv.parkingOnly.weekly}/7 nights`}
              details="RV site only • hookups remain locked"
              selected={rvPackage === 'Parking Only'}
              onPress={() => setRvPackage('Parking Only')}
            />

            <PackageCard
              title="Electric + Water"
              price={`$${RANCH_CONFIG.pricing.rv.electricWater.nightly}/night`}
              weekly={`$${RANCH_CONFIG.pricing.rv.electricWater.weekly}/7 nights`}
              details="Electric and water service enabled"
              selected={rvPackage === 'Electric + Water'}
              onPress={() => setRvPackage('Electric + Water')}
            />

            <PackageCard
              title="Full Hookup (Deluxe service)"
              price={`$${RANCH_CONFIG.pricing.rv.deluxe.nightly}/night`}
              weekly={`$${RANCH_CONFIG.pricing.rv.deluxe.weekly}/7 nights`}
              details="Electric • water • septic • Wi-Fi"
              selected={rvPackage === 'Full Hookup'}
              onPress={() => setRvPackage('Full Hookup')}
            />

            <PackageCard
              title="Deluxe"
              price={`$${RANCH_CONFIG.pricing.rv.deluxe.nightly}/night`}
              weekly={`$${RANCH_CONFIG.pricing.rv.deluxe.weekly}/7 nights`}
              details="Verified full-hookup service with Wi-Fi"
              selected={rvPackage === 'Deluxe'}
              onPress={() => setRvPackage('Deluxe')}
              featured
            />
          </View>
        )}

        <StayCard
          icon="🏕️"
          title="Tent Camping"
          description="10 campsites • includes 2 adults + 4 children"
          price="$25/night"
          selected={selectedStay === 'tent'}
          onPress={() => setSelectedStay('tent')}
        />

        {selectedStay === 'tent' && (
          <View style={styles.detailBox}>
            <DetailRow label="Base rate" value="$25/night" />
            <DetailRow label="Additional adult" value="+$10" />
            <DetailRow label="Additional child" value="+$5" />
            <DetailRow label="Additional vehicle" value="+$10" />
            <DetailRow label="Bring ATV / SxS" value="+$75/stay" />
          </View>
        )}

        <StayCard
          icon="🚎"
          title="Rental RV • Sleeps 4–5"
          description="White Oak Ranch rental RV"
          price="$75/night"
          selected={selectedStay === 'small-rv'}
          onPress={() => setSelectedStay('small-rv')}
        />

        {selectedStay === 'small-rv' && (
          <View style={styles.detailBox}>
            <DetailRow label="Standard rate" value="$75/night" />
            <DetailRow label="Event / holiday rate" value="$99/night" />
            <DetailRow label="Sleeps" value="4–5 guests" />
          </View>
        )}

        <StayCard
          icon="🚌"
          title="Rental RV • Sleeps 6–8"
          description="Larger White Oak Ranch rental RV"
          price="$99/night"
          selected={selectedStay === 'large-rv'}
          onPress={() => setSelectedStay('large-rv')}
        />

        {selectedStay === 'large-rv' && (
          <View style={styles.detailBox}>
            <DetailRow label="Standard rate" value="$99/night" />
            <DetailRow label="Event / holiday rate" value="$125/night" />
            <DetailRow label="Sleeps" value="6–8 guests" />
          </View>
        )}

        {selectedStay && (
          <View style={styles.nextSection}>
            <Text style={styles.nextTitle}>
              {getSelectionTitle(selectedStay, rvPackage)}
            </Text>

            <Text style={styles.nextText}>
              Next we'll add date selection and live availability so guests can
              reserve an actual site or rental.
            </Text>

           <TouchableOpacity
  style={styles.continueButton}
  onPress={() =>
    router.push({
      pathname: '/feature-preview',
      params: {
        title: 'Dates & Availability',
        icon: '📅',
        description:
          'Guests will choose arrival and departure dates here, then the system will show live available RV sites, campsites and rental RVs.',
      },
    })
  }
>
  <Text style={styles.continueButtonText}>Choose Dates</Text>
</TouchableOpacity>
</View>
)}
        <View style={styles.footer}>
          <Text style={styles.footerLogo}>WHITE OAK RANCH</Text>
          <Text style={styles.footerText}>Tennessee Resort & Campground</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StayCard({
  icon,
  title,
  description,
  price,
  selected,
  onPress,
}: {
  icon: string;
  title: string;
  description: string;
  price: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.stayCard, selected && styles.stayCardSelected]}
      onPress={onPress}
    >
      <View style={styles.iconBox}>
        <Text style={styles.icon}>{icon}</Text>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
        <Text style={styles.cardPrice}>{price}</Text>
      </View>

      <Text style={styles.cardArrow}>{selected ? '⌄' : '›'}</Text>
    </TouchableOpacity>
  );
}

function PackageCard({
  title,
  price,
  weekly,
  details,
  selected,
  onPress,
  featured = false,
}: {
  title: string;
  price: string;
  weekly?: string;
  details: string;
  selected: boolean;
  onPress: () => void;
  featured?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.packageCard,
        featured && styles.featuredPackage,
        selected && styles.packageSelected,
      ]}
    >
      <View style={styles.packageTop}>
        <View>
          <View style={styles.packageTitleRow}>
            <Text style={styles.packageTitle}>{title}</Text>
            {featured && <Text style={styles.bestBadge}>FULL ACCESS</Text>}
          </View>

          <Text style={styles.packageDetails}>{details}</Text>
        </View>

        <View style={styles.packagePriceArea}>
          <Text style={styles.packagePrice}>{price}</Text>
          {weekly && <Text style={styles.weeklyPrice}>{weekly}</Text>}
        </View>
      </View>

      {selected && (
        <Text style={styles.selectedText}>✓ Selected</Text>
      )}
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

function getSelectionTitle(
  selectedStay: StayType,
  rvPackage: string | null
) {
  if (selectedStay === 'rv-site') {
    return rvPackage
      ? `RV Site • ${rvPackage}`
      : 'Choose an RV service package';
  }

  if (selectedStay === 'tent') return 'Tent Camping';
  if (selectedStay === 'small-rv') return 'Rental RV • Sleeps 4–5';
  if (selectedStay === 'large-rv') return 'Rental RV • Sleeps 6–8';

  return '';
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
    fontSize: 30,
    fontWeight: '800',
    marginTop: 3,
  },

  headerSubtitle: {
    color: '#CCD4CD',
    fontSize: 13,
    marginTop: 4,
  },

  intro: {
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 20,
  },

  introTitle: {
    color: '#203B2A',
    fontSize: 25,
    fontWeight: '800',
  },

  introText: {
    color: '#656963',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 7,
  },

  sectionLabel: {
    color: '#787B76',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginHorizontal: 22,
    marginBottom: 10,
  },

  stayCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 18,
    marginBottom: 12,
    borderRadius: 17,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },

  stayCardSelected: {
    borderColor: '#9B8A68',
  },

  iconBox: {
    width: 58,
    height: 58,
    borderRadius: 15,
    backgroundColor: '#EEF0E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  icon: {
    fontSize: 29,
  },

  cardBody: {
    flex: 1,
  },

  cardTitle: {
    color: '#203B2A',
    fontSize: 18,
    fontWeight: '800',
  },

  cardDescription: {
    color: '#747873',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },

  cardPrice: {
    color: '#9B7952',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 7,
  },

  cardArrow: {
    color: '#9B8A68',
    fontSize: 30,
    marginLeft: 8,
  },

  packageSection: {
    backgroundColor: '#EAE6DA',
    marginHorizontal: 18,
    marginTop: -2,
    marginBottom: 16,
    borderRadius: 18,
    padding: 14,
  },

  packageHeading: {
    color: '#203B2A',
    fontSize: 18,
    fontWeight: '800',
  },

  packageSubheading: {
    color: '#656963',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    marginBottom: 12,
  },

  packageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 13,
    padding: 14,
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  featuredPackage: {
    backgroundColor: '#FDFBF5',
  },

  packageSelected: {
    borderColor: '#203B2A',
  },

  packageTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  packageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  packageTitle: {
    color: '#203B2A',
    fontSize: 16,
    fontWeight: '800',
  },

  bestBadge: {
    marginLeft: 8,
    backgroundColor: '#D8C59D',
    color: '#203B2A',
    fontSize: 8,
    fontWeight: '900',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 20,
    letterSpacing: 0.7,
  },

  packageDetails: {
    color: '#747873',
    fontSize: 12,
    marginTop: 4,
    maxWidth: 205,
  },

  packagePriceArea: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },

  packagePrice: {
    color: '#203B2A',
    fontSize: 15,
    fontWeight: '900',
  },

  weeklyPrice: {
    color: '#9B7952',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },

  selectedText: {
    color: '#203B2A',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 10,
  },

  detailBox: {
    backgroundColor: '#EAE6DA',
    marginHorizontal: 18,
    marginTop: -3,
    marginBottom: 16,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#D6D0C2',
  },

  detailLabel: {
    color: '#626660',
    fontSize: 13,
  },

  detailValue: {
    color: '#203B2A',
    fontSize: 13,
    fontWeight: '800',
  },

  nextSection: {
    backgroundColor: '#203B2A',
    marginHorizontal: 18,
    marginTop: 16,
    borderRadius: 18,
    padding: 20,
  },

  nextTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },

  nextText: {
    color: '#D6DDD7',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },

  continueButton: {
    backgroundColor: '#D8C59D',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },

  continueButtonText: {
    color: '#203B2A',
    fontSize: 15,
    fontWeight: '900',
  },

  footer: {
    alignItems: 'center',
    marginTop: 34,
  },

  footerLogo: {
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
