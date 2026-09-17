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

type EventStatus = 'PUBLISHED' | 'DRAFT';

type RanchEvent = {
  id: string;
  title: string;
  date: string;
  type: string;
  registrations: number;
  staff: number;
  status: EventStatus;
};

const startingEvents: RanchEvent[] = [
  {
    id: '1',
    title: 'Demo Ranch Weekend',
    date: 'Oct 10–12',
    type: 'Public Event',
    registrations: 24,
    staff: 4,
    status: 'PUBLISHED',
  },
  {
    id: '2',
    title: 'Demo Private Gathering',
    date: 'Oct 24',
    type: 'Private Event',
    registrations: 38,
    staff: 5,
    status: 'DRAFT',
  },
];

export default function ManageEventsScreen() {
  const [events, setEvents] = useState(startingEvents);

  const published = events.filter(
    (event) => event.status === 'PUBLISHED'
  ).length;

  const totalRegistrations = events.reduce(
    (sum, event) => sum + event.registrations,
    0
  );

  function createDemoEvent() {
    const newEvent: RanchEvent = {
      id: Date.now().toString(),
      title: 'New Ranch Event',
      date: 'Date TBD',
      type: 'Public Event',
      registrations: 0,
      staff: 0,
      status: 'DRAFT',
    };

    setEvents((current) => [newEvent, ...current]);

    Alert.alert(
      'Draft Event Created',
      'Demo mode: a new event draft has been added. In production, this will open the full event editor.'
    );
  }

  function togglePublish(id: string) {
    setEvents((current) =>
      current.map((event) =>
        event.id === id
          ? {
              ...event,
              status:
                event.status === 'PUBLISHED'
                  ? 'DRAFT'
                  : 'PUBLISHED',
            }
          : event
      )
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
            <Text style={styles.title}>Manage Events</Text>
            <Text style={styles.subtitle}>
              Events, staffing & registrations
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatCard
            value={events.length.toString()}
            label="Events"
          />

          <StatCard
            value={published.toString()}
            label="Published"
          />

          <StatCard
            value={totalRegistrations.toString()}
            label="Guests"
          />
        </View>

        <TouchableOpacity
          style={styles.createButton}
          onPress={createDemoEvent}
        >
          <Text style={styles.createIcon}>＋</Text>

          <View>
            <Text style={styles.createTitle}>
              Create New Event
            </Text>

            <Text style={styles.createSubtitle}>
              Public event or private gathering
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Event Calendar
          </Text>

          <Text style={styles.sectionCount}>
            {events.length} total
          </Text>
        </View>

        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onTogglePublish={() =>
              togglePublish(event.id)
            }
          />
        ))}

        <View style={styles.workflowCard}>
          <Text style={styles.workflowLabel}>
            EVENT WORKFLOW
          </Text>

          <Text style={styles.workflowTitle}>
            One event, connected everywhere.
          </Text>

          <WorkflowRow text="Create event and select dates" />
          <WorkflowRow text="Set public or private visibility" />
          <WorkflowRow text="Set admission and event pricing" />
          <WorkflowRow text="Assign staff and responsibilities" />
          <WorkflowRow text="Track registrations and attendance" />
          <WorkflowRow text="Apply event camping rates automatically" />
          <WorkflowRow text="Publish to the customer Events page" />
        </View>

        <View style={styles.operationsCard}>
          <Text style={styles.operationsLabel}>
            OPERATIONS
          </Text>

          <Text style={styles.operationsTitle}>
            Event-day coordination
          </Text>

          <OperationRow
            icon="🎟️"
            title="Admissions"
            description="Day passes, tickets and guest lists"
          />

          <OperationRow
            icon="🏕️"
            title="Camping"
            description="RV sites, tents and rental RV inventory"
          />

          <OperationRow
            icon="🛻"
            title="ATV / SxS"
            description="Access purchases and event rules"
          />

          <OperationRow
            icon="👷"
            title="Staffing"
            description="Assignments and event coverage"
          />

          <OperationRow
            icon="🔐"
            title="Gate Access"
            description="Temporary guest access windows"
          />

          <OperationRow
            icon="💳"
            title="Payments"
            description="Registration and event revenue"
          />
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>
            Production version
          </Text>

          <Text style={styles.noteText}>
            Events will eventually be stored in the White Oak Ranch
            database. Publishing an event here can automatically make
            it visible to guests, activate special pricing, coordinate
            reservations and create staff scheduling requirements.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>
            WHITE OAK RANCH
          </Text>

          <Text style={styles.footerText}>
            Event Operations
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function EventCard({
  event,
  onTogglePublish,
}: {
  event: RanchEvent;
  onTogglePublish: () => void;
}) {
  const isPublished =
    event.status === 'PUBLISHED';

  return (
    <View style={styles.eventCard}>
      <View style={styles.eventTop}>
        <View style={styles.dateBox}>
          <Text style={styles.dateIcon}>📅</Text>
        </View>

        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>
            {event.title}
          </Text>

          <Text style={styles.eventDate}>
            {event.date}
          </Text>

          <Text style={styles.eventType}>
            {event.type}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            isPublished
              ? styles.publishedBadge
              : styles.draftBadge,
          ]}
        >
          <Text style={styles.statusText}>
            {event.status}
          </Text>
        </View>
      </View>

      <View style={styles.eventStats}>
        <View style={styles.eventStat}>
          <Text style={styles.eventStatValue}>
            {event.registrations}
          </Text>

          <Text style={styles.eventStatLabel}>
            Registrations
          </Text>
        </View>

        <View style={styles.eventDivider} />

        <View style={styles.eventStat}>
          <Text style={styles.eventStatValue}>
            {event.staff}
          </Text>

          <Text style={styles.eventStatLabel}>
            Staff
          </Text>
        </View>
      </View>

      <View style={styles.eventActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() =>
            Alert.alert(
              'Event Editor',
              'The full event editor will be connected during the production phase.'
            )
          }
        >
          <Text style={styles.editButtonText}>
            Edit Event
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.publishButton,
            isPublished &&
              styles.unpublishButton,
          ]}
          onPress={onTogglePublish}
        >
          <Text style={styles.publishButtonText}>
            {isPublished
              ? 'Unpublish'
              : 'Publish'}
          </Text>
        </TouchableOpacity>
      </View>
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
      <Text style={styles.statValue}>
        {value}
      </Text>

      <Text style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
}

function WorkflowRow({
  text,
}: {
  text: string;
}) {
  return (
    <View style={styles.workflowRow}>
      <Text style={styles.check}>✓</Text>
      <Text style={styles.workflowText}>
        {text}
      </Text>
    </View>
  );
}

function OperationRow({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.operationRow}>
      <View style={styles.operationIcon}>
        <Text style={styles.operationEmoji}>
          {icon}
        </Text>
      </View>

      <View style={styles.operationBody}>
        <Text style={styles.operationTitle}>
          {title}
        </Text>

        <Text style={styles.operationDescription}>
          {description}
        </Text>
      </View>
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
    backgroundColor:
      'rgba(255,255,255,0.12)',
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

  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 14,
    marginTop: 18,
  },

  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },

  statValue: {
    color: '#203B2A',
    fontSize: 23,
    fontWeight: '900',
  },

  statLabel: {
    color: '#7A7E78',
    fontSize: 10,
    marginTop: 3,
  },

  createButton: {
    marginHorizontal: 18,
    marginTop: 16,
    backgroundColor: '#203B2A',
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },

  createIcon: {
    color: '#D8C59D',
    fontSize: 32,
    fontWeight: '300',
    marginRight: 14,
  },

  createTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },

  createSubtitle: {
    color: '#CBD4CC',
    fontSize: 11,
    marginTop: 3,
  },

  sectionHeader: {
    marginHorizontal: 20,
    marginTop: 26,
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

  eventCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 18,
    marginBottom: 12,
    borderRadius: 18,
    padding: 16,
  },

  eventTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  dateBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#EAE6DA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  dateIcon: {
    fontSize: 21,
  },

  eventInfo: {
    flex: 1,
  },

  eventTitle: {
    color: '#203B2A',
    fontSize: 16,
    fontWeight: '900',
  },

  eventDate: {
    color: '#9B7952',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 3,
  },

  eventType: {
    color: '#7A7D78',
    fontSize: 10,
    marginTop: 3,
  },

  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  publishedBadge: {
    backgroundColor: '#E5EEE7',
  },

  draftBadge: {
    backgroundColor: '#F2E7DD',
  },

  statusText: {
    color: '#203B2A',
    fontSize: 8,
    fontWeight: '900',
  },

  eventStats: {
    flexDirection: 'row',
    marginTop: 15,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: '#ECE9E1',
  },

  eventStat: {
    flex: 1,
    alignItems: 'center',
  },

  eventStatValue: {
    color: '#203B2A',
    fontSize: 18,
    fontWeight: '900',
  },

  eventStatLabel: {
    color: '#81847F',
    fontSize: 9,
    marginTop: 2,
  },

  eventDivider: {
    width: 1,
    backgroundColor: '#E3DFD5',
  },

  eventActions: {
    flexDirection: 'row',
    marginTop: 14,
  },

  editButton: {
    flex: 1,
    backgroundColor: '#EAE6DA',
    borderRadius: 11,
    paddingVertical: 11,
    alignItems: 'center',
    marginRight: 5,
  },

  editButtonText: {
    color: '#203B2A',
    fontSize: 11,
    fontWeight: '900',
  },

  publishButton: {
    flex: 1,
    backgroundColor: '#203B2A',
    borderRadius: 11,
    paddingVertical: 11,
    alignItems: 'center',
    marginLeft: 5,
  },

  unpublishButton: {
    backgroundColor: '#6B776C',
  },

  publishButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },

  workflowCard: {
    marginHorizontal: 18,
    marginTop: 12,
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
    fontSize: 12,
    flex: 1,
  },

  operationsCard: {
    marginHorizontal: 18,
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
  },

  operationsLabel: {
    color: '#9B7952',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.3,
  },

  operationsTitle: {
    color: '#203B2A',
    fontSize: 19,
    fontWeight: '900',
    marginTop: 5,
    marginBottom: 10,
  },

  operationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEAE2',
  },

  operationIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#F0EDE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  operationEmoji: {
    fontSize: 17,
  },

  operationBody: {
    flex: 1,
  },

  operationTitle: {
    color: '#203B2A',
    fontSize: 13,
    fontWeight: '900',
  },

  operationDescription: {
    color: '#7A7D78',
    fontSize: 10,
    marginTop: 2,
  },

  noteCard: {
    marginHorizontal: 18,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#D7D1C3',
    borderRadius: 16,
    padding: 17,
  },

  noteTitle: {
    color: '#203B2A',
    fontSize: 15,
    fontWeight: '900',
  },

  noteText: {
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