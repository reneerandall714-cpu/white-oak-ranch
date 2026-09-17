import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TimeClockScreen() {
  const [clockedIn, setClockedIn] = useState(false);
  const [secondsWorked, setSecondsWorked] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    if (clockedIn) {
      interval = setInterval(() => {
        setSecondsWorked((current) => current + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [clockedIn]);

  const formattedTime = formatTime(secondsWorked);

  function handleClockAction() {
    if (clockedIn) {
      setClockedIn(false);
    } else {
      setSecondsWorked(0);
      setClockedIn(true);
    }
  }

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
            <Text style={styles.title}>Time Clock</Text>
            <Text style={styles.subtitle}>Contractor hours</Text>
          </View>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>CURRENT STATUS</Text>

          <View style={styles.statusRow}>
            <Text
              style={[
                styles.statusDot,
                clockedIn ? styles.dotActive : styles.dotInactive,
              ]}
            >
              ●
            </Text>

            <Text style={styles.statusTitle}>
              {clockedIn ? 'Clocked In' : 'Clocked Out'}
            </Text>
          </View>

          <Text style={styles.statusText}>
            {clockedIn
              ? 'Your current shift is being tracked.'
              : 'You are not currently on the clock.'}
          </Text>
        </View>

        <View style={styles.clockCard}>
          <Text style={styles.clockLabel}>CURRENT SHIFT</Text>

          <Text style={styles.timer}>{formattedTime}</Text>

          <Text style={styles.timerLabel}>Hours : Minutes : Seconds</Text>

          <TouchableOpacity
            style={[
              styles.clockButton,
              clockedIn && styles.clockOutButton,
            ]}
            onPress={handleClockAction}
          >
            <Text style={styles.clockButtonText}>
              {clockedIn ? 'CLOCK OUT' : 'CLOCK IN'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.todayCard}>
          <Text style={styles.sectionTitle}>Today</Text>

          <DetailRow label="Hours worked" value={clockedIn ? formattedTime : '0:00:00'} />
          <DetailRow label="Pay period" value="Sep 1 – Sep 15" />
          <DetailRow label="Time status" value={clockedIn ? 'Active' : 'Not clocked in'} />
        </View>

        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recent Shifts</Text>

          <ShiftCard
            day="Monday"
            date="Sep 14"
            time="8:03 AM – 5:12 PM"
            hours="9.15 hrs"
          />

          <ShiftCard
            day="Sunday"
            date="Sep 13"
            time="9:02 AM – 3:47 PM"
            hours="6.75 hrs"
          />

          <ShiftCard
            day="Saturday"
            date="Sep 12"
            time="7:58 AM – 4:22 PM"
            hours="8.40 hrs"
          />
        </View>

        <View style={styles.payBox}>
          <Text style={styles.payLabel}>PAY PERIOD SUMMARY</Text>
          <Text style={styles.payTitle}>24.30 hours</Text>
          <Text style={styles.payText}>
            Approved contractor hours can eventually flow into contractor
            payment calculations and QuickBooks.
          </Text>
        </View>

        <View style={styles.noteBox}>
          <Text style={styles.noteTitle}>Planned safeguards</Text>
          <Text style={styles.noteText}>
            The final system can support manager approvals, time corrections,
            location rules, event assignments and locked payment periods.
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

function ShiftCard({
  day,
  date,
  time,
  hours,
}: {
  day: string;
  date: string;
  time: string;
  hours: string;
}) {
  return (
    <View style={styles.shiftCard}>
      <View>
        <Text style={styles.shiftDay}>{day}</Text>
        <Text style={styles.shiftDate}>{date}</Text>
      </View>

      <View style={styles.shiftMiddle}>
        <Text style={styles.shiftTime}>{time}</Text>
      </View>

      <Text style={styles.shiftHours}>{hours}</Text>
    </View>
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

function formatTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
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

  statusCard: {
    marginHorizontal: 18,
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
  },

  statusLabel: {
    color: '#9B7952',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },

  statusDot: {
    fontSize: 18,
    marginRight: 8,
  },

  dotActive: {
    color: '#4C7256',
  },

  dotInactive: {
    color: '#A7AAA5',
  },

  statusTitle: {
    color: '#203B2A',
    fontSize: 24,
    fontWeight: '900',
  },

  statusText: {
    color: '#6B6F69',
    fontSize: 13,
    marginTop: 7,
  },

  clockCard: {
    marginHorizontal: 18,
    marginTop: 14,
    backgroundColor: '#203B2A',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
  },

  clockLabel: {
    color: '#D8C59D',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  timer: {
    color: '#FFFFFF',
    fontSize: 46,
    fontWeight: '900',
    marginTop: 12,
  },

  timerLabel: {
    color: '#C6CEC7',
    fontSize: 11,
    marginTop: 3,
  },

  clockButton: {
    width: '100%',
    backgroundColor: '#D8C59D',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },

  clockOutButton: {
    backgroundColor: '#C68D72',
  },

  clockButtonText: {
    color: '#203B2A',
    fontSize: 16,
    fontWeight: '900',
  },

  todayCard: {
    marginHorizontal: 18,
    marginTop: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
  },

  sectionTitle: {
    color: '#203B2A',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 12,
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEAE1',
  },

  detailLabel: {
    color: '#737772',
    fontSize: 13,
  },

  detailValue: {
    color: '#203B2A',
    fontSize: 13,
    fontWeight: '800',
  },

  recentSection: {
    marginTop: 24,
    paddingHorizontal: 18,
  },

  shiftCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  shiftDay: {
    color: '#203B2A',
    fontSize: 14,
    fontWeight: '900',
  },

  shiftDate: {
    color: '#858984',
    fontSize: 11,
    marginTop: 2,
  },

  shiftMiddle: {
    flex: 1,
    paddingHorizontal: 14,
  },

  shiftTime: {
    color: '#6E726D',
    fontSize: 12,
    textAlign: 'center',
  },

  shiftHours: {
    color: '#9B7952',
    fontSize: 13,
    fontWeight: '900',
  },

  payBox: {
    marginHorizontal: 18,
    marginTop: 18,
    backgroundColor: '#EAE6DA',
    borderRadius: 18,
    padding: 20,
  },

  payLabel: {
    color: '#9B7952',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.3,
  },

  payTitle: {
    color: '#203B2A',
    fontSize: 27,
    fontWeight: '900',
    marginTop: 5,
  },

  payText: {
    color: '#646963',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },

  noteBox: {
    marginHorizontal: 18,
    marginTop: 14,
    borderRadius: 16,
    padding: 17,
    borderWidth: 1,
    borderColor: '#D7D1C3',
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