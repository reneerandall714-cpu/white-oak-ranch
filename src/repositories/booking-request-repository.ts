import { CUSTOMER_REQUEST_SUBMISSION_ENABLED, STAFF_BOOKING_REQUESTS_ENABLED } from '../constants/feature-flags';
import { normalizeBookingRequestReceipt, validateBookingRequest, type BookingRequestDraft, type BookingRequestReceipt, type BookingRequestStatus, type StaffBookingRequest } from '../data/bookingRequests';
import { supabase } from '../lib/supabase';

export type BookingRequestError = 'disabled' | 'validation' | 'rate_limited' | 'conflict' | 'pricing_changed' | 'session' | 'permission' | 'connectivity' | 'unavailable';
export type RequestResult = { receipt: BookingRequestReceipt | null; error: BookingRequestError | null };

export function mapBookingRequestError(error: { code?: string; message?: string } | null, status?: number): BookingRequestError {
  if (!error || status === 0) return 'connectivity';
  if (error.code === 'WR400' || error.code === '22023' || error.code === '23514') return 'validation';
  if (error.code === 'WR429') return 'rate_limited';
  if (error.code === 'WR409' || error.code === '23P01' || error.code === '23505') return 'conflict';
  if (error.code === 'WR412') return 'pricing_changed';
  if (status === 401 || error.code === 'PGRST301') return 'session';
  if (status === 403 || error.code === '42501') return 'permission';
  return 'unavailable';
}

export const BOOKING_REQUEST_ERROR_TEXT: Record<BookingRequestError, string> = {
  disabled: 'Online requests are not available yet. Please call the ranch.',
  validation: 'Review your details and dates, then try again.',
  rate_limited: 'Too many requests were received. Please wait and call the ranch if urgent.',
  conflict: 'This site or request is no longer available. Refresh availability before trying again.',
  pricing_changed: 'The price changed. Staff must review it before approval.',
  session: 'Your staff session expired. Sign in again.',
  permission: 'This account is not authorized for that action.',
  connectivity: 'Could not connect. Please retry with the same details; a duplicate request will not be created.',
  unavailable: 'The request service is temporarily unavailable. Please retry or call the ranch.',
};

export async function submitBookingRequest(draft: BookingRequestDraft, idempotencyKey: string): Promise<RequestResult> {
  if (!CUSTOMER_REQUEST_SUBMISSION_ENABLED) return { receipt: null, error: 'disabled' };
  if (validateBookingRequest(draft)) return { receipt: null, error: 'validation' };
  try {
    const { data, error, status } = await supabase.rpc('ranch_submit_booking_request', {
      p_idempotency_key: idempotencyKey,
      p_guest_name: draft.guestName.trim(), p_email: draft.email.trim() || null,
      p_phone: draft.phone.trim() || null, p_note: draft.note.trim() || null,
      p_unit: draft.unit, p_stay_type: draft.stayType, p_rv_service: draft.rvService,
      p_arrival: draft.arrival, p_departure: draft.departure,
      p_guests: draft.guests, p_atv_access: draft.atvAccess,
    });
    if (error) return { receipt: null, error: mapBookingRequestError(error, status) };
    const receipt = normalizeBookingRequestReceipt(data);
    return { receipt, error: receipt ? null : 'unavailable' };
  } catch { return { receipt: null, error: 'connectivity' }; }
}

const STAFF_COLUMNS = 'id, guest_name, email, phone, note, unit, stay_type, rv_service, arrival, departure, guests, atv_access, quoted_total, status, submitted_at, decided_at, decision_note, reservation_id';
type RequestRow = {
  id: string; guest_name: string; email: string | null; phone: string | null;
  note: string | null; unit: string; stay_type: BookingRequestDraft['stayType'];
  rv_service: BookingRequestDraft['rvService']; arrival: string; departure: string;
  guests: number; atv_access: boolean; quoted_total: number | string;
  status: BookingRequestStatus; submitted_at: string; decided_at: string | null;
  decision_note: string | null; reservation_id: string | null;
};
function toStaffRequest(row: RequestRow): StaffBookingRequest {
  return {
    requestId: row.id, guestName: row.guest_name, email: row.email ?? '', phone: row.phone ?? '',
    note: row.note ?? '', unit: row.unit, stayType: row.stay_type, rvService: row.rv_service,
    arrival: row.arrival, departure: row.departure, guests: row.guests, atvAccess: row.atv_access,
    quotedTotal: Number(row.quoted_total), status: row.status, submittedAt: row.submitted_at,
    decidedAt: row.decided_at, decisionNote: row.decision_note, reservationId: row.reservation_id,
  };
}
export async function listStaffBookingRequests(): Promise<{ requests: StaffBookingRequest[]; error: BookingRequestError | null }> {
  if (!STAFF_BOOKING_REQUESTS_ENABLED) return { requests: [], error: 'disabled' };
  try {
    const { data, error, status } = await supabase.from('ranch_booking_requests')
      .select(STAFF_COLUMNS).order('submitted_at', { ascending: false }).limit(200);
    if (error) return { requests: [], error: mapBookingRequestError(error, status) };
    return { requests: ((data ?? []) as unknown as RequestRow[]).map(toStaffRequest), error: null };
  } catch { return { requests: [], error: 'connectivity' }; }
}
export async function decideStaffBookingRequest(id: string, decision: Exclude<BookingRequestStatus, 'PENDING'>, note: string): Promise<BookingRequestError | null> {
  if (!STAFF_BOOKING_REQUESTS_ENABLED) return 'disabled';
  try {
    const { data, error, status } = await supabase.rpc('ranch_decide_booking_request', {
      p_request_id: id, p_decision: decision, p_decision_note: note.trim() || null,
    });
    if (error) return mapBookingRequestError(error, status);
    const row = Array.isArray(data) ? data[0] : data;
    return row?.request_status === decision ? null : 'unavailable';
  } catch { return 'connectivity'; }
}
