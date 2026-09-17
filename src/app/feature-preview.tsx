import { router, useLocalSearchParams } from 'expo-router';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FeaturePreviewScreen() {
  const params = useLocalSearchParams<{
    title?: string;
    description?: string;
    icon?: string;
  }>();

  const title = params.title || 'Coming Soon';
  const description =
    params.description ||
    'This feature is planned for the White Oak Ranch platform.';
  const icon = params.icon || '🌳';

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
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>Feature preview</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.icon}>{icon}</Text>

          <Text style={styles.heroTitle}>{title}</Text>

          <Text style={styles.heroText}>{description}</Text>
        </View>

        <View style={styles.buildCard}>
          <Text style={styles.buildLabel}>PLANNED FOR PRODUCTION</Text>

          <Feature text="Connected to the White Oak Ranch database" />
          <Feature text="Role-based staff permissions" />
          <Feature text="Secure customer and business data" />
          <Feature text="Automatic activity and audit history" />
          <Feature text="Designed to work with the rest of the ranch platform" />
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>DEVELOPMENT STATUS</Text>
          <Text style={styles.statusTitle}>Prototype planned</Text>
          <Text style={styles.statusText}>
            The workflow and interface are being designed now. Live data,
            database actions and external integrations will be connected during
            the production phase.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => router.replace('/')}
        >
          <Text style={styles.homeButtonText}>RETURN TO HOME</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>WHITE OAK RANCH</Text>
          <Text style={styles.footerText}>Operations Platform</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.check}>✓</Text>
      <Text style={styles.featureText}>{text}</Text>
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

  heroCard: {
    marginHorizontal: 18,
    marginTop: 22,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },

  icon: {
    fontSize: 56,
  },

  heroTitle: {
    color: '#203B2A',
    fontSize: 25,
    fontWeight: '900',
    marginTop: 14,
    textAlign: 'center',
  },

  heroText: {
    color: '#666A64',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 9,
    textAlign: 'center',
  },

  buildCard: {
    marginHorizontal: 18,
    marginTop: 16,
    backgroundColor: '#EAE6DA',
    borderRadius: 18,
    padding: 20,
  },

  buildLabel: {
    color: '#9B7952',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 13,
  },

  featureRow: {
    flexDirection: 'row',
    marginBottom: 9,
  },

  check: {
    color: '#203B2A',
    fontWeight: '900',
    marginRight: 8,
  },

  featureText: {
    color: '#626660',
    fontSize: 13,
    flex: 1,
  },

  statusCard: {
    marginHorizontal: 18,
    marginTop: 16,
    backgroundColor: '#203B2A',
    borderRadius: 18,
    padding: 20,
  },

  statusLabel: {
    color: '#D8C59D',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  statusTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 5,
  },

  statusText: {
    color: '#D6DDD7',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },

  homeButton: {
    marginHorizontal: 18,
    marginTop: 18,
    backgroundColor: '#D8C59D',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },

  homeButtonText: {
    color: '#203B2A',
    fontSize: 14,
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