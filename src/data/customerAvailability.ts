export type PublicUnit = {
  unitId: string;
  stayType: string;
  isAvailable: boolean;
};

// Treat RPC results as untrusted. Project only approved public fields, even if
// a future server change adds private columns to the response by mistake.
export function normalizePublicUnits(value: unknown): PublicUnit[] | null {
  if (!Array.isArray(value)) return null;
  const units: PublicUnit[] = [];
  for (const row of value) {
    if (!row || typeof row !== 'object') return null;
    const fields = row as Record<string, unknown>;
    if (typeof fields.unit_id !== 'string' ||
      typeof fields.stay_type !== 'string' ||
      typeof fields.is_available !== 'boolean') return null;
    units.push({ unitId: fields.unit_id, stayType: fields.stay_type, isAvailable: fields.is_available });
  }
  return units;
}

export const CUSTOMER_STAY_TYPES = {
  'rv-site': 'RV Site',
  tent: 'Tent Site',
  'small-rv': 'Small Rental RV',
  'large-rv': 'Large Rental RV',
} as const;

export type CustomerStayChoice = keyof typeof CUSTOMER_STAY_TYPES;

function parseDay(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const day = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(day.getTime()) && day.toISOString().slice(0, 10) === value
    ? day.getTime()
    : null;
}

export function chicagoToday(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const value = (name: string) => parts.find((part) => part.type === name)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function validateStayDates(
  arrival: string,
  departure: string,
  today = chicagoToday()
): { nights: number; error: string | null } {
  const start = parseDay(arrival);
  const end = parseDay(departure);
  const current = parseDay(today);
  if (start === null || end === null || current === null) {
    return { nights: 0, error: 'Enter valid arrival and departure dates (YYYY-MM-DD).' };
  }
  if (start < current) return { nights: 0, error: 'Arrival cannot be in the past.' };
  const maxArrival = new Date(current);
  maxArrival.setUTCMonth(maxArrival.getUTCMonth() + 18);
  if (start > maxArrival.getTime()) {
    return { nights: 0, error: 'Choose an arrival within the next 18 months.' };
  }
  const nights = Math.round((end - start) / 86400000);
  if (nights < 1 || nights > 365) {
    return { nights: 0, error: 'Choose a stay of 1 to 365 nights.' };
  }
  return { nights, error: null };
}

export function staysOverlap(
  arrivalA: string, departureA: string, arrivalB: string, departureB: string
): boolean {
  return arrivalA < departureB && arrivalB < departureA;
}

export function availableUnitsForStay(units: PublicUnit[], stayType: string): PublicUnit[] {
  return units.filter((unit) => unit.stayType === stayType && unit.isAvailable);
}

export function maxGuestsForStay(stayType: string): number {
  if (stayType === 'Tent Site') return 6;
  if (stayType === 'Small Rental RV') return 5;
  if (stayType === 'Large Rental RV') return 8;
  return 8; // A conservative request limit; staff can discuss larger RV parties.
}
