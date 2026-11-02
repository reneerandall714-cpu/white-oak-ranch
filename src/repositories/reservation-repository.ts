import { supabase } from '../lib/supabase';
import { calculateStayPricing, type RVServiceName } from '../data/ranchConfig';
import { canSaveLiveReservationPricing } from '../data/liveReservationPricing';
import { LIVE_WEEKLY_RESERVATION_PRICING_ENABLED } from '../constants/feature-flags';
import {
  buildReservationInsert,
  mapReservationAccessError,
  mapReservationSaveError,
  type ReservationAccessError,
  type ReservationSaveError,
} from './reservation-request';
import type {
  ReservationRecord,
  ReservationStatus,
} from '../data/reservationdata';

export type ReservationRepositoryError = ReservationAccessError;

export type ReservationWriteError = ReservationSaveError;

export type ReservationRepositoryResult = {
  reservations: ReservationRecord[];
  error: ReservationRepositoryError | null;
};

export type StaffReservationDraft = {
  guestName: string;
  phone?: string;
  unit: string;
  stayType: 'Tent Site' | 'RV Site' | 'Small Rental RV' | 'Large Rental RV';
  rvService?: RVServiceName;
  arrival: string;
  departure: string;
  guests: number;
  atvAccess: boolean;
  nightlyRate: number;
  nights: number;
  total: number;
};

export type ReservationWriteResult = {
  reservation: ReservationRecord | null;
  error: ReservationWriteError | null;
};

export type UnitAvailabilityResult = {
  available: boolean;
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

const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'CHECKED_IN'];

function mapReservationRow(reservation: LiveReservationRow): ReservationRecord {
  return {
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
  };
}

export async function listStaffReservations(): Promise<ReservationRepositoryResult> {
  const { data, error, status } = await supabase
    .from('ranch_reservations')
    .select(RESERVATION_COLUMNS)
    .order('arrival', { ascending: true })
    .order('id', { ascending: true });

  if (error) {
    return {
      reservations: [],
      error: mapReservationAccessError(error, status),
    };
  }

  const rows = (data ?? []) as unknown as LiveReservationRow[];

  return {
    reservations: rows.map(mapReservationRow),
    error: null,
  };
}

export async function checkStaffUnitAvailability(
  unit: string,
  stayType: string,
  arrival: string,
  departure: string
): Promise<UnitAvailabilityResult> {
  const { data, error, status } = await supabase
    .from('ranch_reservations')
    .select('arrival, departure')
    .eq('unit', unit)
    .eq('stay_type', stayType)
    .in('status', ACTIVE_STATUSES);

  if (error) {
    return {
      available: false,
      error: mapReservationAccessError(error, status),
    };
  }

  const requestedArrival = new Date(`${arrival}T00:00:00`);
  const requestedDeparture = new Date(`${departure}T00:00:00`);
  const overlaps = (data ?? []).some((reservation) => {
    const existingArrival = new Date(`${reservation.arrival}T00:00:00`);
    const existingDeparture = new Date(`${reservation.departure}T00:00:00`);
    return (
      requestedArrival < existingDeparture &&
      requestedDeparture > existingArrival
    );
  });

  return { available: !overlaps, error: null };
}

export async function createStaffReservation(
  draft: StaffReservationDraft
): Promise<ReservationWriteResult> {
  const arrival = Date.parse(`${draft.arrival}T00:00:00Z`);
  const departure = Date.parse(`${draft.departure}T00:00:00Z`);
  const actualNights = (departure - arrival) / 86_400_000;
  if (!Number.isInteger(actualNights) || actualNights < 1 || draft.nights !== actualNights) {
    return { reservation: null, error: 'invalid_draft' };
  }

  const pricing = calculateStayPricing({
    stayType: draft.stayType,
    rvService: draft.stayType === 'RV Site' ? draft.rvService : undefined,
    nights: actualNights,
    atvAccess: draft.atvAccess,
  });
  if (draft.nightlyRate !== pricing.nightlyRate || draft.total !== pricing.total) {
    return { reservation: null, error: 'invalid_draft' };
  }
  if (!canSaveLiveReservationPricing(
    pricing,
    draft.rvService,
    LIVE_WEEKLY_RESERVATION_PRICING_ENABLED
  )) {
    return { reservation: null, error: 'pricing_unavailable' };
  }

  const { data, error, status } = await supabase
    .from('ranch_reservations')
    .insert(buildReservationInsert(draft))
    .select(RESERVATION_COLUMNS)
    .single();

  if (error || !data) {
    return {
      reservation: null,
      error: error ? mapReservationSaveError(error, status) : 'unavailable',
    };
  }

  return {
    reservation: mapReservationRow(data as unknown as LiveReservationRow),
    error: null,
  };
}
