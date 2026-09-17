import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { loadReservations } from '../data/reservationdata';
export default function RootLayout() { 
  useEffect(() => {
  void loadReservations();
}, []);
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}