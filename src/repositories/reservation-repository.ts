import { supabase } from '../lib/supabase';
import type {
  ReservationRecord,
  ReservationStatus,
} from '../data/reservationdata';

export type ReservationRepositoryError = 'permission' | 'unavailable';

export type ReservationRepositoryResult = {
  reservations: ReservationRecord[];
  error: ReservationRepositoryError | null;
};

type LiveReservationRow = {
  id: string;
  guest_name: string;
  phone: string | null;
  unit: string;
  stay_type: string;
  rv_service: string | null;
  arrival: string;
  departure: string;
  guests: number;
  atv_access: boolean;
  nightly_rate: number;
  nights: number | null;
  total: number;
  status: string;
};

const RESERVATION_COLUMNS = [
  'id',
  'guest_name',
  'phone',
  'unit',
  'stay_type',
  'rv_service',
  'arrival',
  'departure',
  'guests',
  'atv_access',
  'nightly_rate',
  'nights',
  'total',
  'status',
].join(', ');

function isPermissionError(error: { code?: string; status?: number }) {
  return (
    error.code === '42501' ||
    error.code === 'PGRST301' ||
    error.status === 401 ||
    error.status === 403
  );
}

export async function listStaffReservations(): Promise<ReservationRepositoryResult> {
  const { data, error } = await supabase
    .from('ranch_reservations')
    .select(RESERVATION_COLUMNS)
    .order('arrival', { ascending: true })
    .order('id', { ascending: true });

  if (error) {
    return {
      reservations: [],
      error: isPermissionError(error) ? 'permission' : 'unavailable',
    };
  }

  const rows = (data ?? []) as unknown as LiveReservationRow[];

  return {
    reservations: rows.map((reservation) => ({
      id: reservation.id,
      guestName: reservation.guest_name,
      phone: reservation.phone ?? undefined,
      unit: reservation.unit,
      stayType: reservation.stay_type,
      rvService: reservation.rv_service ?? undefined,
      arrival: reservation.arrival,
      departure: reservation.departure,
      guests: reservation.guests ?? undefined,
      atvAccess: reservation.atv_access,
      nightlyRate: reservation.nightly_rate ?? undefined,
      nights: reservation.nights ?? undefined,
      total: reservation.total ?? undefined,
      status: reservation.status as ReservationStatus,
    })),
    error: null,
  };
}
