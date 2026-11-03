import { router } from 'expo-router';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Image
            source={require('../../assets/white-oak-ranch-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.eyebrow}>DUNLAP, TENNESSEE</Text>

          <Text style={styles.title}>White Oak Ranch</Text>

          <Text style={styles.subtitle}>
            Tennessee Resort & Campground
          </Text>

          <Text style={styles.heroText}>
            Camp, explore, gather and enjoy the ranch.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/booking')}
          >
            <Text style={styles.primaryButtonText}>Check Dates & Rates</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Welcome to the Ranch</Text>

          <Text style={styles.sectionText}>
            Plan your stay, purchase day access, manage memberships, explore
            events and keep everything White Oak Ranch in one place.
          </Text>
        </View>

        <View style={styles.grid}>
          <MenuCard
            icon="🏕️"
            title="Stay"
            subtitle="Camping & RVs"
            onPress={() => router.push('/booking')}
          />

          <MenuCard
            icon="🎟️"
            title="Day Pass"
            subtitle="Visit for the day"
            onPress={() => router.push('/day-pass')}
          />

          <MenuCard
            icon="🌳"
            title="Memberships"
            subtitle="Join the ranch"
            onPress={() => router.push('/memberships')}
          />

        <MenuCard
  icon="🗓️"
  title="Events"
  subtitle="See what's happening"
  onPress={() => router.push('/events')}
/>

        </View>

        <TouchableOpacity
         style={styles.accessCard}
         onPress={() => router.push('/my-access')}
>
          <View style={styles.cardCopy}>
            <Text style={styles.accessLabel}>MY ACCESS</Text>
            <Text style={styles.accessTitle}>Gate & Ranch Access</Text>
            <Text style={styles.accessText}>
              View active reservations, passes and memberships.
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.staffCard}
          onPress={() => router.push('/staff-login')}
        >
          <View style={styles.cardCopy}>
            <Text style={styles.staffLabel}>STAFF</Text>
            <Text style={styles.staffTitle}>Staff & Admin</Text>
            <Text style={styles.staffText}>
              Reservations, gate access, scheduling, time and payments.
            </Text>
          </View>

          <Text style={styles.staffArrow}>›</Text>
        </TouchableOpacity>

        <View style={styles.quickInfo}>
          <Text style={styles.quickInfoTitle}>At White Oak Ranch</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>🏕️</Text>
            <Text style={styles.infoText}>10 tent campsites</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>🚐</Text>
            <Text style={styles.infoText}>11 deluxe-capable RV sites</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>🚎</Text>
            <Text style={styles.infoText}>2 ranch-owned rental RVs</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>🏍️</Text>
            <Text style={styles.infoText}>ATV / SxS access available</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Image
            source={require('../../assets/white-oak-ranch-logo.png')}
            style={styles.footerLogoImage}
            resizeMode="contain"
          />

          <Text style={styles.footerTitle}>WHITE OAK RANCH</Text>
          <Text style={styles.footerText}>Dunlap, Tennessee</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuCard({
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
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Text style={styles.cardIcon}>{icon}</Text>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
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

  hero: {
    backgroundColor: '#203B2A',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 38,
    alignItems: 'center',
  },

  logo: {
    width: 150,
    height: 150,
    marginBottom: 14,
  },

  eyebrow: {
    color: '#D8C59D',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '900',
    marginTop: 7,
    textAlign: 'center',
  },

  subtitle: {
    color: '#D8C59D',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 3,
  },

  heroText: {
    color: '#E2E7E2',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 24,
  },

  primaryButton: {
    width: '100%',
    backgroundColor: '#D8C59D',
    borderRadius: 13,
    paddingVertical: 15,
    alignItems: 'center',
  },

  primaryButtonText: {
    color: '#203B2A',
    fontSize: 16,
    fontWeight: '900',
  },

  section: {
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 18,
  },

  sectionTitle: {
    color: '#203B2A',
    fontSize: 25,
    fontWeight: '900',
  },

  sectionText: {
    color: '#626660',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 7,
  },

  grid: {
    paddingHorizontal: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  card: {
    width: '46%',
    backgroundColor: '#FFFFFF',
    margin: '2%',
    borderRadius: 17,
    padding: 18,
    minHeight: 142,
  },

  cardIcon: {
    fontSize: 30,
    marginBottom: 12,
  },

  cardTitle: {
    color: '#203B2A',
    fontSize: 18,
    fontWeight: '900',
  },

  cardSubtitle: {
    color: '#777A75',
    fontSize: 13,
    marginTop: 4,
  },

  accessCard: {
    marginHorizontal: 18,
    marginTop: 22,
    backgroundColor: '#203B2A',
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },

  cardCopy: {
    flex: 1,
  },

  accessLabel: {
    color: '#D8C59D',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  accessTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 5,
  },

  accessText: {
    color: '#D9DED9',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 5,
  },

  arrow: {
    color: '#D8C59D',
    fontSize: 40,
    marginLeft: 10,
  },

  staffCard: {
    marginHorizontal: 18,
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD8CB',
  },

  staffLabel: {
    color: '#9B7952',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  staffTitle: {
    color: '#203B2A',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 5,
  },

  staffText: {
    color: '#737772',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 5,
  },

  staffArrow: {
    color: '#9B8A68',
    fontSize: 40,
    marginLeft: 10,
  },

  quickInfo: {
    backgroundColor: '#EAE6DA',
    marginHorizontal: 18,
    marginTop: 20,
    borderRadius: 18,
    padding: 18,
  },

  quickInfoTitle: {
    color: '#203B2A',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },

  infoIcon: {
    fontSize: 18,
    width: 32,
  },

  infoText: {
    color: '#626660',
    fontSize: 13,
    fontWeight: '600',
  },

  footer: {
    alignItems: 'center',
    marginTop: 36,
  },

  footerLogoImage: {
    width: 75,
    height: 75,
    marginBottom: 8,
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
