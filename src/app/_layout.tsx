import { Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useEffect } from 'react';
import { StaffAuthProvider, useStaffAuth } from '../contexts/staff-auth-context';
import { loadReservations } from '../data/reservationdata';

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
        <Stack.Screen name="new-reservation" />
        <Stack.Screen name="staff-new-reservation" />
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
      <RootNavigator />
    </StaffAuthProvider>
  );
}

const styles = StyleSheet.create({
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
