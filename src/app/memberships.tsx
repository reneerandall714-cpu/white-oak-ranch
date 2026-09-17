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

type MembershipType = 'individual' | 'family' | 'rv' | null;

export default function MembershipsScreen() {
  const [selected, setSelected] = useState<MembershipType>(null);

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
            <Text style={styles.title}>Memberships</Text>
            <Text style={styles.subtitle}>Make the ranch part of your year</Text>
          </View>
        </View>

        <View style={styles.intro}>
          <Text style={styles.introTitle}>Choose your membership.</Text>

          <Text style={styles.introText}>
            Memberships are designed for guests who want to return throughout
            the year and enjoy easier access to White Oak Ranch.
          </Text>
        </View>

        <MembershipCard
          title="Individual Membership"
          price="$145"
          period="/ year"
          description="Annual membership for one person."
          bullets={[
            'Annual ranch membership',
            'Member account and status',
            'Future app-based gate access',
            'Easy renewal from the app',
          ]}
          selected={selected === 'individual'}
          onPress={() => setSelected('individual')}
        />

        <MembershipCard
          title="Family Membership"
          price="From $275"
          period="/ year"
          description="Annual membership for families."
          bullets={[
            'Designed for household access',
            'Manage covered family members',
            'Future app-based gate access',
            'Easy annual renewal',
          ]}
          selected={selected === 'family'}
          onPress={() => setSelected('family')}
          featured
        />

        <MembershipCard
          title="RV Membership + Storage"
          price="From $1,500"
          period="/ year"
          description="Annual RV membership with storage options."
          bullets={[
            'Annual RV membership',
            'RV storage',
            'Member account and access status',
            'Admin-managed renewal and storage details',
          ]}
          selected={selected === 'rv'}
          onPress={() => setSelected('rv')}
        />

        {selected && (
          <View style={styles.summary}>
            <Text style={styles.summaryLabel}>SELECTED MEMBERSHIP</Text>

            <Text style={styles.summaryTitle}>
              {selected === 'individual' && 'Individual Membership'}
              {selected === 'family' && 'Family Membership'}
              {selected === 'rv' && 'RV Membership + Storage'}
            </Text>

            <Text style={styles.summaryText}>
              Next, we’ll connect membership details, customer information,
              payment, renewal and member gate access. </Text>
      <TouchableOpacity
        style={styles.continueButton}
        onPress={() =>
          router.push({
            pathname: '/feature-preview',
            params: {
              title: 'Membership Setup',
              icon: '🌳',
              description:
                'Customers will enter membership details, covered household members and payment information here.',
            },
          })
        }
      >
        <Text style={styles.continueButtonText}>Continue</Text>
      </TouchableOpacity>
    </View>)}
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

function MembershipCard({
  title,
  price,
  period,
  description,
  bullets,
  selected,
  onPress,
  featured = false,
}: {
  title: string;
  price: string;
  period: string;
  description: string;
  bullets: string[];
  selected: boolean;
  onPress: () => void;
  featured?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        featured && styles.featuredCard,
        selected && styles.selectedCard,
      ]}
      onPress={onPress}
    >
      {featured && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>POPULAR</Text>
        </View>
      )}

      <View style={styles.cardTop}>
        <View style={styles.cardHeading}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardDescription}>{description}</Text>
        </View>

        <View style={styles.priceArea}>
          <Text style={styles.price}>{price}</Text>
          <Text style={styles.period}>{period}</Text>
        </View>
      </View>

      <View style={styles.bulletList}>
        {bullets.map((bullet) => (
          <View key={bullet} style={styles.bulletRow}>
            <Text style={styles.check}>✓</Text>
            <Text style={styles.bulletText}>{bullet}</Text>
          </View>
        ))}
      </View>

      <View style={styles.selectRow}>
        <Text style={styles.selectText}>
          {selected ? 'Selected' : 'Select Membership'}
        </Text>
        <Text style={styles.selectArrow}>{selected ? '✓' : '›'}</Text>
      </View>
    </TouchableOpacity>
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

  intro: {
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 18,
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

  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 18,
    marginBottom: 14,
    borderRadius: 18,
    padding: 18,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  featuredCard: {
    backgroundColor: '#FDFBF5',
  },

  selectedCard: {
    borderColor: '#203B2A',
  },

  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#D8C59D',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 12,
  },

  badgeText: {
    color: '#203B2A',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },

  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  cardHeading: {
    flex: 1,
    paddingRight: 14,
  },

  cardTitle: {
    color: '#203B2A',
    fontSize: 19,
    fontWeight: '800',
  },

  cardDescription: {
    color: '#747873',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },

  priceArea: {
    alignItems: 'flex-end',
  },

  price: {
    color: '#9B7952',
    fontSize: 19,
    fontWeight: '900',
  },

  period: {
    color: '#878A85',
    fontSize: 11,
    marginTop: 2,
  },

  bulletList: {
    marginTop: 16,
  },

  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },

  check: {
    color: '#203B2A',
    fontSize: 14,
    fontWeight: '900',
    marginRight: 8,
  },

  bulletText: {
    color: '#5F645E',
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },

  selectRow: {
    borderTopWidth: 1,
    borderTopColor: '#ECE9E1',
    marginTop: 10,
    paddingTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  selectText: {
    color: '#203B2A',
    fontSize: 14,
    fontWeight: '800',
  },

  selectArrow: {
    color: '#9B8A68',
    fontSize: 24,
    fontWeight: '800',
  },

  summary: {
    backgroundColor: '#203B2A',
    marginHorizontal: 18,
    marginTop: 6,
    borderRadius: 18,
    padding: 20,
  },

  summaryLabel: {
    color: '#D8C59D',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  summaryTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '800',
    marginTop: 6,
  },

  summaryText: {
    color: '#D6DDD7',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
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
    fontSize: 14,
    fontWeight: '900',
  },

  note: {
    backgroundColor: '#EAE6DA',
    marginHorizontal: 18,
    marginTop: 18,
    borderRadius: 16,
    padding: 17,
  },

  noteTitle: {
    color: '#203B2A',
    fontSize: 15,
    fontWeight: '800',
  },

  noteText: {
    color: '#656963',
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