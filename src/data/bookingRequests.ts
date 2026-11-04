import { maxGuestsForStay, validateStayDates } from './customerAvailability.ts';
import { calculateLiveStayPricing } from './liveReservationPricing.ts';
import type { RVServiceName } from './ranchConfig.ts';

export type BookingRequestStatus = 'PENDING' | 'AWAITING_PAYMENT' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'PAYMENT_REVIEW' | 'CANCELLED';
export type BookingRequestDraft = {
  guestName: string;
  email: string;
  phone: string;
  note: string;
  unit: string;
  stayType: 'RV Site' | 'Tent Site' | 'Small Rental RV' | 'Large Rental RV';
  rvService: RVServiceName | null;
  arrival: string;
  departure: string;
  guests: number;
  atvAccess: boolean;
};
export type BookingRequestReceipt = {
  requestId: string;
  status: BookingRequestStatus;
  quotedTotal: number;
};
export type StaffBookingRequest = BookingRequestDraft & BookingRequestReceipt & {
  submittedAt: string;
  decidedAt: string | null;
  decisionNote: string | null;
  reservationId: string | null;
  checkoutToken: string | null;
  holdExpiresAt: string | null;
  balanceDueCents: number | null;
  balanceDueOn: string | null;
};

export function validateBookingRequest(draft: BookingRequestDraft): string | null {
  if (!draft.guestName.trim() || draft.guestName.trim().length > 200) return 'Enter a name (up to 200 characters).';
  const email = draft.email.trim();
  const phone = draft.phone.replace(/\D/g, '');
  if (!email && !phone) return 'Enter an email address or phone number.';
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return 'Enter a valid email address.';
  if (draft.phone && (!/^[+0-9(). -]+$/.test(draft.phone.trim()) || phone.length < 7 || phone.length > 15)) return 'Enter a valid phone number.';
  if (draft.note.length > 1000) return 'Keep the note under 1,000 characters.';
  const dates = validateStayDates(draft.arrival, draft.departure);
  if (dates.error) return dates.error;
  if (!draft.unit || draft.unit.length > 30) return 'Choose an available site.';
  if (!Number.isInteger(draft.guests) || draft.guests < 1 || draft.guests > maxGuestsForStay(draft.stayType)) return 'Guest count exceeds this stay type’s limit.';
  if (draft.stayType === 'RV Site' && !['Parking Only', 'Electric + Water', 'Deluxe'].includes(draft.rvService ?? '')) return 'Choose an RV service.';
  if (draft.stayType !== 'RV Site' && draft.rvService !== null) return 'RV service is only available for RV sites.';
  const quote = calculateLiveStayPricing({ stayType: draft.stayType, rvService: draft.rvService ?? undefined, nights: dates.nights, atvAccess: draft.atvAccess });
  if (!Number.isFinite(quote.total) || quote.total <= 0) return 'Could not calculate the stay price.';
  return null;
}

export function normalizeBookingRequestReceipt(value: unknown): BookingRequestReceipt | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== 'object') return null;
  const fields = row as Record<string, unknown>;
  if (typeof fields.request_id !== 'string' || !/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(fields.request_id) ||
      !['PENDING', 'AWAITING_PAYMENT', 'APPROVED', 'REJECTED', 'EXPIRED', 'PAYMENT_REVIEW', 'CANCELLED'].includes(String(fields.request_status)) ||
      (typeof fields.quoted_total !== 'number' && typeof fields.quoted_total !== 'string')) return null;
  const total = Number(fields.quoted_total);
  if (!Number.isFinite(total) || total < 0) return null;
  return { requestId: fields.request_id, status: fields.request_status as BookingRequestStatus, quotedTotal: total };
}
