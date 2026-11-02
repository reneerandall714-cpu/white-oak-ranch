import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStaffAuth } from '../contexts/staff-auth-context';
import {
  listStaffInventory,
  type InventoryRepositoryError,
  type RanchUnit,
} from '../repositories/inventory-repository';

const ERROR_MESSAGES: Record<InventoryRepositoryError, string> = {
  permission:
    'Your staff account does not have permission to view ranch inventory.',
  unavailable: 'Ranch inventory is temporarily unavailable. Try again.',
};

export default function InventoryScreen() {
  const { isStaff } = useStaffAuth();
  const [units, setUnits] = useState<RanchUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<InventoryRepositoryError | null>(null);

  const loadInventory = useCallback(async () => {
    if (!isStaff) {
      setUnits([]);
      setError('permission');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await listStaffInventory();
    setUnits(result.units);
    setError(result.error);
    setIsLoading(false);
  }, [isStaff]);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <View>
            <Text style={styles.eyebrow}>WHITE OAK RANCH</Text>
            <Text style={styles.title}>Inventory</Text>
            <Text style={styles.subtitle}>Read-only ranch units</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color="#203B2A" />
            <Text style={styles.stateTitle}>Loading inventory...</Text>
          </View>
        ) : error ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Inventory unavailable</Text>
            <Text style={styles.stateText}>{ERROR_MESSAGES[error]}</Text>
            <TouchableOpacity
              onPress={() => void loadInventory()}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>TRY AGAIN</Text>
            </TouchableOpacity>
          </View>
        ) : units.length === 0 ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>No units found</Text>
            <Text style={styles.stateText}>
              No ranch units are currently available to this staff account.
            </Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            <Text style={styles.sectionLabel}>{units.length} UNITS</Text>
            {units.map((unit) => (
              <View key={unit.id} style={styles.unitRow}>
                <View style={styles.unitCopy}>
                  <Text style={styles.unitName}>{unit.id}</Text>
                  <Text style={styles.unitType}>{unit.stayType}</Text>
                </View>
                <Text style={styles.readOnlyLabel}>READ ONLY</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F4F1E8',
    flex: 1,
  },
  container: {
    paddingBottom: 50,
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#203B2A',
    flexDirection: 'row',
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    marginRight: 15,
    width: 44,
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
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
  },
  subtitle: {
    color: '#D6DDD7',
    fontSize: 13,
    marginTop: 4,
  },
  stateCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    margin: 18,
    padding: 28,
  },
  stateTitle: {
    color: '#203B2A',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 12,
    textAlign: 'center',
  },
  stateText: {
    color: '#747873',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#203B2A',
    borderRadius: 12,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    margin: 18,
    overflow: 'hidden',
  },
  sectionLabel: {
    color: '#9B8A68',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  unitRow: {
    alignItems: 'center',
    borderBottomColor: '#ECECE5',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  unitCopy: {
    flex: 1,
  },
  unitName: {
    color: '#203B2A',
    fontSize: 16,
    fontWeight: '800',
  },
  unitType: {
    color: '#747873',
    fontSize: 12,
    marginTop: 4,
  },
  readOnlyLabel: {
    color: '#9B8A68',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginLeft: 12,
  },
});
