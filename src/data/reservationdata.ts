export type ReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'COMPLETED'
  | 'CANCELLED';

  import AsyncStorage from '@react-native-async-storage/async-storage';
export type ReservationRecord = {
  id: string;
  guestName: string;
  phone?: string;
  unit: string;
  stayType?: string;
  rvService?: string;
  arrival: string;
  departure: string;
  guests?: number;
  atvAccess?: boolean;
  nightlyRate?: number;
  nights?: number;
  total?: number;
  status: ReservationStatus;
  updatedAt?: string;
};

/*
  Temporary demo reservations.

  Dates use YYYY-MM-DD internally because this format is much easier
  and safer for availability calculations than MM/DD/YYYY.

  These records will eventually come from the database.
*/
export const DEMO_RESERVATIONS: ReservationRecord[] = [
  {
    id: 'demo-001',
    guestName: 'Demo Guest',
    unit: 'RV 03',
    arrival: '2026-10-10',
    departure: '2026-10-12',
    status: 'CONFIRMED',
  },
  {
    id: 'demo-002',
    guestName: 'Demo Family',
    unit: 'Tent 04',
    arrival: '2026-10-11',
    departure: '2026-10-13',
    status: 'CONFIRMED',
  },
  {
    id: 'demo-003',
    guestName: 'Demo Rental',
    unit: 'Large Rental RV',
    arrival: '2026-10-14',
    departure: '2026-10-16',
    status: 'PENDING',
  },
];

export function parseDateInput(input: string): Date | null {
  const trimmed = input.trim();

  // Accept MM/DD/YYYY
  const slashMatch = trimmed.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
  );

  if (slashMatch) {
    const month = Number(slashMatch[1]);
    const day = Number(slashMatch[2]);
    const year = Number(slashMatch[3]);

    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return date;
    }

    return null;
  }

  // Also accept YYYY-MM-DD
  const isoMatch = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);

    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return date;
    }
  }

  return null;
}

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function datesOverlap(
  requestedArrival: Date,
  requestedDeparture: Date,
  existingArrival: Date,
  existingDeparture: Date
): boolean {
  /*
    Departure day is NOT treated as occupied.

    Example:
    Guest A: Oct 10 → Oct 12
    Guest B: Oct 12 → Oct 14

    This is allowed because Guest A checks out on Oct 12
    before Guest B occupies the unit.
  */
  return (
    requestedArrival < existingDeparture &&
    requestedDeparture > existingArrival
  );
}

export function isValidStayRange(
  arrivalInput: string,
  departureInput: string
): boolean {
  const arrival = parseDateInput(arrivalInput);
  const departure = parseDateInput(departureInput);

  if (!arrival || !departure) {
    return false;
  }

  return departure > arrival;
}

export function calculateNights(
  arrivalInput: string,
  departureInput: string
): number | null {
  const arrival = parseDateInput(arrivalInput);
  const departure = parseDateInput(departureInput);

  if (!arrival || !departure || departure <= arrival) {
    return null;
  }

  const millisecondsPerDay = 1000 * 60 * 60 * 24;

  const arrivalUTC = Date.UTC(
    arrival.getFullYear(),
    arrival.getMonth(),
    arrival.getDate()
  );

  const departureUTC = Date.UTC(
    departure.getFullYear(),
    departure.getMonth(),
    departure.getDate()
  );

  return Math.round(
    (departureUTC - arrivalUTC) / millisecondsPerDay
  );
}

export function isUnitAvailable(
  unit: string,
  arrivalInput: string,
  departureInput: string,
  reservations: ReservationRecord[] = DEMO_RESERVATIONS
): boolean {
  const requestedArrival = parseDateInput(arrivalInput);
  const requestedDeparture = parseDateInput(departureInput);

  if (
    !requestedArrival ||
    !requestedDeparture ||
    requestedDeparture <= requestedArrival
  ) {
    return false;
  }

  const blockingReservations = reservations.filter(
    (reservation) =>
      reservation.unit === unit &&
      reservation.status !== 'CANCELLED' &&
      reservation.status !== 'COMPLETED'
  );

  return !blockingReservations.some((reservation) => {
    const existingArrival = parseDateInput(reservation.arrival);
    const existingDeparture = parseDateInput(reservation.departure);

    if (!existingArrival || !existingDeparture) {
      return false;
    }

    return datesOverlap(
      requestedArrival,
      requestedDeparture,
      existingArrival,
      existingDeparture
    );
  });
}

export function getUnavailableUnits(
  arrivalInput: string,
  departureInput: string,
  reservations: ReservationRecord[] = DEMO_RESERVATIONS
): string[] {
  if (!isValidStayRange(arrivalInput, departureInput)) {
    return [];
  }

  const unavailable = new Set<string>();

  reservations.forEach((reservation) => {
    if (
      reservation.status === 'CANCELLED' ||
      reservation.status === 'COMPLETED'
    ) {
      return;
    }

    const existingArrival = parseDateInput(reservation.arrival);
    const existingDeparture = parseDateInput(reservation.departure);
    const requestedArrival = parseDateInput(arrivalInput);
    const requestedDeparture = parseDateInput(departureInput);

    if (
      !existingArrival ||
      !existingDeparture ||
      !requestedArrival ||
      !requestedDeparture
    ) {
      return;
    }

    if (
      datesOverlap(
        requestedArrival,
        requestedDeparture,
        existingArrival,
        existingDeparture
      )
    ) {
      unavailable.add(reservation.unit);
    }
  });

  return Array.from(unavailable);
}

export function addReservation(
  reservation: Omit<ReservationRecord, 'id'>
): ReservationRecord {
  const newReservation: ReservationRecord = {
    ...reservation,
    id: `reservation-${Date.now()}`,
  };
 DEMO_RESERVATIONS.push(newReservation);

void saveReservations();

return newReservation;
}
const RESERVATIONS_STORAGE_KEY = 'white-oak-ranch-reservations';

export async function saveReservations(): Promise<void> {
  try {
    await AsyncStorage.setItem(
      RESERVATIONS_STORAGE_KEY,
      JSON.stringify(DEMO_RESERVATIONS)
    );
  } catch (error) {
    console.error('Failed to save reservations:', error);
  }
}

export async function loadReservations(): Promise<ReservationRecord[]> {
  try {
    const storedReservations = await AsyncStorage.getItem(
      RESERVATIONS_STORAGE_KEY
    );

    if (!storedReservations) {
      return DEMO_RESERVATIONS;
    }

    const parsedReservations: ReservationRecord[] =
      JSON.parse(storedReservations);

    DEMO_RESERVATIONS.splice(
      0,
      DEMO_RESERVATIONS.length,
      ...parsedReservations
    );

    return DEMO_RESERVATIONS;
  } catch (error) {
    console.error('Failed to load reservations:', error);
    return DEMO_RESERVATIONS;
  }
}
