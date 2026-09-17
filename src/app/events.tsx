import { router } from 'expo-router';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EventsScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>WHITE OAK RANCH</Text>
          <Text style={styles.title}>Events</Text>
          <Text style={styles.subtitle}>
            Gather, celebrate and make some memories at the ranch.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>UPCOMING EVENTS</Text>

          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🌳</Text>
            <Text style={styles.emptyTitle}>More adventures are coming.</Text>
            <Text style={styles.emptyText}>
              Upcoming public events, special weekends and ranch activities
              will appear here.
            </Text>
          </View>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Special Event Pricing</Text>
          <Text style={styles.noticeText}>
            Camping and rental rates may change during special events and
            holidays. Event-specific pricing will be shown before booking.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>HOST YOUR EVENT</Text>

          <Text style={styles.hostTitle}>
            Your event belongs somewhere memorable.
          </Text>

          <Text style={styles.hostText}>
            White Oak Ranch offers space for private gatherings surrounded by
            the lake, trails and Tennessee countryside.
          </Text>

          <View style={styles.eventGrid}>
            <EventType icon="💍" title="Weddings" />
            <EventType icon="🎂" title="Parties" />
            <EventType icon="🏢" title="Corporate Events" />
            <EventType icon="👨‍👩‍👧‍👦" title="Family Gatherings" />
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() =>
              router.push({
                pathname: '/feature-preview',
                params: {
                  title: 'Private Event Request',
                  icon: '🎉',
                  description:
                    'Guests will be able to request dates, estimated attendance and event details here.',
                },
              })
            }
          >
            <Text style={styles.primaryButtonText}>Plan an Event</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.ranchCard}>
          <Text style={styles.ranchCardTitle}>Make a weekend of it.</Text>
          <Text style={styles.ranchCardText}>
            Event guests can stay right here at White Oak Ranch with tent
            camping, RV sites and rental RVs available.
          </Text>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/booking')}
          >
            <Text style={styles.secondaryButtonText}>Explore Stays</Text>
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

function EventType({
  icon,
  title,
}: {
  icon: string;
  title: string;
}) {
  return (
    <View style={styles.eventType}>
      <Text style={styles.eventIcon}>{icon}</Text>
      <Text style={styles.eventTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F0E6',
  },

  container: {
    flex: 1,
    backgroundColor: '#F4F0E6',
  },

  content: {
    padding: 20,
    paddingBottom: 50,
  },

  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },

  backText: {
    color: '#31523A',
    fontSize: 17,
    fontWeight: '700',
  },

  header: {
    marginBottom: 30,
  },

  eyebrow: {
    color: '#8A6B3E',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
  },

  title: {
    color: '#1E3525',
    fontSize: 38,
    fontWeight: '900',
  },

  subtitle: {
    color: '#5F665F',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 8,
  },

  section: {
    marginBottom: 28,
  },

  sectionLabel: {
    color: '#31523A',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 14,
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
  },

  emptyIcon: {
    fontSize: 34,
    marginBottom: 12,
  },

  emptyTitle: {
    color: '#1E3525',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },

  emptyText: {
    color: '#626862',
    fontSize: 15,
    lineHeight: 22,
  },

  notice: {
    backgroundColor: '#E7DDC8',
    borderRadius: 18,
    padding: 18,
    marginBottom: 30,
  },

  noticeTitle: {
    color: '#594627',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },

  noticeText: {
    color: '#665A45',
    fontSize: 14,
    lineHeight: 21,
  },

  hostTitle: {
    color: '#1E3525',
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 10,
  },

  hostText: {
    color: '#626862',
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 20,
  },

  eventGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  eventType: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },

  eventIcon: {
    fontSize: 26,
    marginBottom: 8,
  },

  eventTitle: {
    color: '#263C2C',
    fontSize: 14,
    fontWeight: '800',
  },

  primaryButton: {
    backgroundColor: '#31523A',
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },

  ranchCard: {
    backgroundColor: '#1E3525',
    borderRadius: 24,
    padding: 22,
    marginBottom: 32,
  },

  ranchCardTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 8,
  },

  ranchCardText: {
    color: '#DDE5DE',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },

  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },

  secondaryButtonText: {
    color: '#31523A',
    fontSize: 15,
    fontWeight: '900',
  },

  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },

  footerTitle: {
    color: '#31523A',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 2,
  },

  footerText: {
    color: '#777A75',
    fontSize: 12,
    marginTop: 5,
  },
});