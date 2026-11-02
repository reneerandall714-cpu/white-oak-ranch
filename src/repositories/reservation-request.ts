import type { StaffReservationDraft } from './reservation-repository';

export type ReservationAccessError =
  | 'session_expired'
  | 'permission'
  | 'connectivity'
  | 'unavailable';

export type ReservationSaveError =
  | ReservationAccessError
  | 'conflict'
  | 'unit_unavailable'
  | 'pricing_unavailable'
  | 'invalid_draft'
  | 'validation';

type RequestError = { code?: string; message?: string };

export function mapReservationAccessError(error: RequestError, status: number): ReservationAccessError {
  if (status === 401 || error.code === 'PGRST301' || error.code === 'PGRST302') {
    return 'session_expired';
  }
  if (status === 403 || error.code === '42501') return 'permission';
  if (status === 0) return 'connectivity';
  return 'unavailable';
}

export function mapReservationSaveError(error: RequestError, status: number): ReservationSaveError {
  if (error.code === '23P01') return 'conflict';
  if (error.code === '23503' && error.message?.includes('ranch_reservations_unit_stay_type_fkey')) {
    return 'unit_unavailable';
  }
  if (
    error.code === '428C9' ||
    error.code === '23502' ||
    error.code === '23503' ||
    error.code === '23505' ||
    error.code === '23514' ||
    error.code === '22007' ||
    error.code === '22008' ||
    error.code === '22P02' ||
    error.code === 'PGRST204'
  ) {
    return 'validation';
  }
  return mapReservationAccessError(error, status);
}

export function buildReservationInsert(draft: StaffReservationDraft) {
  return {
    guest_name: draft.guestName.trim(),
    phone: draft.phone?.trim() || null,
    unit: draft.unit,
    stay_type: draft.stayType,
    rv_service: draft.stayType === 'RV Site' ? draft.rvService ?? null : null,
    arrival: draft.arrival,
    departure: draft.departure,
    guests: draft.guests,
    atv_access: draft.atvAccess,
    nightly_rate: draft.nightlyRate,
    // nights is GENERATED ALWAYS from the dates in public.ranch_reservations.
    total: draft.total,
    status: 'CONFIRMED',
  };
}
