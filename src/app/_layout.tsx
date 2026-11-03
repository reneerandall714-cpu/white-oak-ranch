import { Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useEffect } from 'react';
import { StaffAuthProvider, useStaffAuth } from '../contexts/staff-auth-context';
import { loadReservations } from '../data/reservationdata';
import { IS_STAGING_BUILD } from '../constants/staging-environment';

function LoadingScreen() {
  return (
    <View style={styles.loadingScreen}>
      <ActivityIndicator color="#203B2A" />
      <Text style={styles.loadingText}>Loading staff access...</Text>
    </View>
  );
}

function RootNavigator() {
  const { isLoading, isStaff } = useStaffAuth();

  if (isLoading) return <LoadingScreen />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="staff-login" />
      <Stack.Protected guard={isStaff}>
        <Stack.Screen name="admin" />
        <Stack.Screen name="manage-reservations" />
        <Stack.Screen name="staff-booking-requests" />
        <Stack.Screen name="new-reservation" />
        <Stack.Screen name="staff-new-reservation" />
        <Stack.Screen name="staff-reservation-detail" />
        <Stack.Screen name="feature-preview" />
        <Stack.Screen name="gate-access" />
        <Stack.Screen name="manage-events" />
        <Stack.Screen name="time-clock" />
        <Stack.Screen name="staff-schedule" />
        <Stack.Screen name="contractor-payments" />
        <Stack.Screen name="payments" />
        <Stack.Screen name="pricing-settings" />
        <Stack.Screen name="inventory" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void loadReservations();
  }, []);

  return (
    <StaffAuthProvider>
      <View style={styles.appRoot}>
        {IS_STAGING_BUILD && <View style={styles.stagingBanner} accessibilityRole="text">
          <Text style={styles.stagingBannerText}>STAGING TEST ENVIRONMENT · NO REAL BOOKINGS</Text>
        </View>}
        <RootNavigator />
      </View>
    </StaffAuthProvider>
  );
}

const styles = StyleSheet.create({
  appRoot: { flex: 1 },
  stagingBanner: { backgroundColor: '#7B4021', paddingHorizontal: 12, paddingVertical: 7, alignItems: 'center' },
  stagingBannerText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 0.7, textAlign: 'center' },
  loadingScreen: {
    alignItems: 'center',
    backgroundColor: '#F4F1E8',
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    color: '#203B2A',
    fontSize: 14,
    marginTop: 12,
  },
});
