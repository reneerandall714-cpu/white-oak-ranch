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

export default function DayPassScreen() {
  const [additionalPasses, setAdditionalPasses] = useState(0);
  const [atvAccess, setAtvAccess] = useState(false);

  const primaryPass = 15;
  const additionalPassTotal = additionalPasses * 10;
  const atvTotal = atvAccess ? 50 : 0;
  const total = primaryPass + additionalPassTotal + atvTotal;

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
            <Text style={styles.title}>Day Pass</Text>
            <Text style={styles.subtitle}>Spend the day at the ranch</Text>
          </View>
        </View>

        <View style={styles.intro}>
          <Text style={styles.introTitle}>Your ranch day starts here.</Text>

          <Text style={styles.introText}>
            Purchase admission for the day and add ATV / SxS access if needed.
          </Text>
        </View>

        <View style={styles.card}>
          <View>
            <Text style={styles.cardTitle}>Primary Day Pass</Text>
            <Text style={styles.cardDescription}>
              Full-day access for one guest
            </Text>
          </View>

          <Text style={styles.price}>$15</Text>
        </View>

        <View style={styles.counterCard}>
          <View style={styles.counterInfo}>
            <Text style={styles.cardTitle}>Additional Day Passes</Text>
            <Text style={styles.cardDescription}>$10 per additional guest</Text>
          </View>

          <View style={styles.counter}>
            <TouchableOpacity
              style={styles.counterButton}
              onPress={() =>
                setAdditionalPasses(Math.max(0, additionalPasses - 1))
              }
            >
              <Text style={styles.counterButtonText}>−</Text>
            </TouchableOpacity>

            <Text style={styles.counterValue}>{additionalPasses}</Text>

            <TouchableOpacity
              style={styles.counterButton}
              onPress={() => setAdditionalPasses(additionalPasses + 1)}
            >
              <Text style={styles.counterButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.addonCard,
            atvAccess && styles.addonCardSelected,
          ]}
          onPress={() => setAtvAccess(!atvAccess)}
        >
          <View style={styles.addonLeft}>
            <Text style={styles.addonIcon}>🏍️</Text>

            <View style={styles.addonText}>
              <Text style={styles.cardTitle}>ATV / SxS Access</Text>
              <Text style={styles.cardDescription}>
                Bring your ATV or side-by-side for day use
              </Text>
              <Text style={styles.proposed}>
                Proposed day-use rate
              </Text>
            </View>
          </View>

          <View style={styles.addonRight}>
            <Text style={styles.price}>$50</Text>
            <Text style={styles.checkbox}>
              {atvAccess ? '✓' : '+'}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Visit Summary</Text>

          <SummaryRow label="Primary Day Pass" value="$15" />

          {additionalPasses > 0 && (
            <SummaryRow
              label={`${additionalPasses} Additional Pass${
                additionalPasses === 1 ? '' : 'es'
              }`}
              value={`$${additionalPassTotal}`}
            />
          )}

          {atvAccess && (
            <SummaryRow label="ATV / SxS Access" value="$50" />
          )}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${total}</Text>
          </View>

          <TouchableOpacity
  style={styles.checkoutButton}
  onPress={() =>
    router.push({
      pathname: '/feature-preview',
      params: {
        title: 'Secure Checkout',
        icon: '💳',
        description:
          'Guests will review their day passes, ATV/SxS access and total here before completing secure payment.',
      },
    })
  }
>
  <Text style={styles.checkoutButtonText}>
    Continue to Checkout
  </Text>
</TouchableOpacity>
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

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
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
    marginBottom: 12,
    borderRadius: 17,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  counterCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 18,
    marginBottom: 12,
    borderRadius: 17,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },

  counterInfo: {
    flex: 1,
  },

  cardTitle: {
    color: '#203B2A',
    fontSize: 17,
    fontWeight: '800',
  },

  cardDescription: {
    color: '#747873',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },

  price: {
    color: '#9B7952',
    fontSize: 18,
    fontWeight: '900',
  },

  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },

  counterButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#203B2A',
    justifyContent: 'center',
    alignItems: 'center',
  },

  counterButtonText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },

  counterValue: {
    width: 38,
    textAlign: 'center',
    color: '#203B2A',
    fontSize: 18,
    fontWeight: '800',
  },

  addonCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 18,
    marginBottom: 18,
    borderRadius: 17,
    padding: 18,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  addonCardSelected: {
    borderColor: '#203B2A',
    backgroundColor: '#FDFBF5',
  },

  addonLeft: {
    flexDirection: 'row',
    flex: 1,
  },

  addonIcon: {
    fontSize: 30,
    marginRight: 12,
  },

  addonText: {
    flex: 1,
  },

  addonRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },

  checkbox: {
    color: '#203B2A',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 10,
  },

  proposed: {
    color: '#9B7952',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 5,
  },

  summary: {
    backgroundColor: '#203B2A',
    marginHorizontal: 18,
    borderRadius: 18,
    padding: 20,
  },

  summaryTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 14,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
  },

  summaryLabel: {
    color: '#D9DED9',
    fontSize: 14,
  },

  summaryValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  totalRow: {
    marginTop: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#58705E',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  totalLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },

  totalValue: {
    color: '#D8C59D',
    fontSize: 24,
    fontWeight: '900',
  },

  checkoutButton: {
    backgroundColor: '#D8C59D',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
  },

  checkoutButtonText: {
    color: '#203B2A',
    fontSize: 15,
    fontWeight: '900',
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