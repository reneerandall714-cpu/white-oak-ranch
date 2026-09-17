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

type DayFilter = 'today' | 'tomorrow' | 'week';

const schedule = [
  {
    id: '1',
    name: 'Renee',
    role: 'Administrative Assistant',
    time: '8:00 AM – 5:00 PM',
    assignment: 'Office / Reservations',
    day: 'today',
  },
  {
    id: '2',
    name: 'Jake',
    role: 'Ranch Staff',
    time: '9:00 AM – 4:00 PM',
    assignment: 'Campground / Guest Support',
    day: 'today',
  },
  {
    id: '3',
    name: 'Sarah',
    role: 'Ranch Staff',
    time: '10:00 AM – 6:00 PM',
    assignment: 'Events / Day Passes',
    day: 'today',
  },
  {
    id: '4',
    name: 'Mike',
    role: 'Maintenance',
    time: '7:00 AM – 3:00 PM',
    assignment: 'Gate / RV Hookups',
    day: 'tomorrow',
  },
  {
    id: '5',
    name: 'Emily',
    role: 'Ranch Staff',
    time: '9:00 AM – 5:00 PM',
    assignment: 'Guest Services',
    day: 'tomorrow',
  },
];

export default function StaffScheduleScreen() {
  const [filter, setFilter] = useState<DayFilter>('today');

  const filtered =
    filter === 'week'
      ? schedule
      : schedule.filter((item) => item.day === filter);

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
            <Text style={styles.title}>Staff Schedule</Text>
            <Text style={styles.subtitle}>Shifts & assignments</Text>
          </View>
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>TODAY</Text>
          <Text style={styles.summaryTitle}>3 Staff Scheduled</Text>
          <Text style={styles.summaryText}>
            Office, campground, guest services and event coverage.
          </Text>
        </View>

        <View style={styles.filterRow}>
          <FilterButton
            label="Today"
            selected={filter === 'today'}
            onPress={() => setFilter('today')}
          />

          <FilterButton
            label="Tomorrow"
            selected={filter === 'tomorrow'}
            onPress={() => setFilter('tomorrow')}
          />

          <FilterButton
            label="Week"
            selected={filter === 'week'}
            onPress={() => setFilter('week')}
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {filter === 'today' && 'Today’s Schedule'}
            {filter === 'tomorrow' && 'Tomorrow’s Schedule'}
            {filter === 'week' && 'Weekly Schedule'}
          </Text>

          <Text style={styles.count}>
            {filtered.length} shift{filtered.length === 1 ? '' : 's'}
          </Text>
        </View>

        {filtered.map((shift) => (
          <ShiftCard
            key={shift.id}
            name={shift.name}
            role={shift.role}
            time={shift.time}
            assignment={shift.assignment}
          />
        ))}

        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Add Shift</Text>
        </TouchableOpacity>

        <View style={styles.assignmentBox}>
          <Text style={styles.assignmentLabel}>SCHEDULING VISION</Text>
          <Text style={styles.assignmentTitle}>Assignments tied to operations</Text>

          <Text style={styles.assignmentText}>
            Staff scheduling can eventually connect directly to reservations,
            events, campground setup, gate coverage and contractor time tracking.
          </Text>
        </View>

        <View style={styles.featureBox}>
          <Text style={styles.featureTitle}>Planned features</Text>

          <FeatureRow text="Availability requests" />
          <FeatureRow text="Time-off requests" />
          <FeatureRow text="Event assignments" />
          <FeatureRow text="Shift notes" />
          <FeatureRow text="Open shifts" />
          <FeatureRow text="Manager approval" />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>WHITE OAK RANCH</Text>
          <Text style={styles.footerText}>Staff Operations</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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

function ShiftCard({
  name,
  role,
  time,
  assignment,
}: {
  name: string;
  role: string;
  time: string;
  assignment: string;
}) {
  return (
    <View style={styles.shiftCard}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{name.charAt(0)}</Text>
      </View>

      <View style={styles.shiftBody}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.role}>{role}</Text>

        <View style={styles.shiftDetails}>
          <Text style={styles.time}>{time}</Text>
          <Text style={styles.assignment}>{assignment}</Text>
        </View>
      </View>

      <Text style={styles.arrow}>›</Text>
    </View>
  );
}

function FeatureRow({ text }: { text: string }) {
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
    fontSize: 30,
    fontWeight: '900',
    marginTop: 3,
  },

  subtitle: {
    color: '#CCD4CD',
    fontSize: 13,
    marginTop: 4,
  },

  summary: {
    marginHorizontal: 18,
    marginTop: 20,
    backgroundColor: '#203B2A',
    borderRadius: 18,
    padding: 20,
  },

  summaryLabel: {
    color: '#D8C59D',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  summaryTitle: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '900',
    marginTop: 5,
  },

  summaryText: {
    color: '#D6DDD7',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },

  filterRow: {
    flexDirection: 'row',
    marginHorizontal: 18,
    marginTop: 16,
    marginBottom: 20,
  },

  filterButton: {
    flex: 1,
    backgroundColor: '#E7E3D9',
    borderRadius: 12,
    marginHorizontal: 4,
    paddingVertical: 11,
    alignItems: 'center',
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

  count: {
    color: '#858984',
    fontSize: 11,
  },

  shiftCard: {
    marginHorizontal: 18,
    marginBottom: 11,
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EAE6DA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
  },

  avatarText: {
    color: '#203B2A',
    fontSize: 18,
    fontWeight: '900',
  },

  shiftBody: {
    flex: 1,
  },

  name: {
    color: '#203B2A',
    fontSize: 16,
    fontWeight: '900',
  },

  role: {
    color: '#7A7D78',
    fontSize: 11,
    marginTop: 2,
  },

  shiftDetails: {
    marginTop: 9,
  },

  time: {
    color: '#203B2A',
    fontSize: 13,
    fontWeight: '800',
  },

  assignment: {
    color: '#9B7952',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },

  arrow: {
    color: '#9B8A68',
    fontSize: 28,
    marginLeft: 8,
  },

  addButton: {
    marginHorizontal: 18,
    marginTop: 8,
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

  assignmentBox: {
    marginHorizontal: 18,
    marginTop: 18,
    backgroundColor: '#EAE6DA',
    borderRadius: 18,
    padding: 20,
  },

  assignmentLabel: {
    color: '#9B7952',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.3,
  },

  assignmentTitle: {
    color: '#203B2A',
    fontSize: 19,
    fontWeight: '900',
    marginTop: 5,
  },

  assignmentText: {
    color: '#646963',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },

  featureBox: {
    marginHorizontal: 18,
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
  },

  featureTitle: {
    color: '#203B2A',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 12,
  },

  featureRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },

  check: {
    color: '#203B2A',
    fontWeight: '900',
    marginRight: 8,
  },

  featureText: {
    color: '#626660',
    fontSize: 13,
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