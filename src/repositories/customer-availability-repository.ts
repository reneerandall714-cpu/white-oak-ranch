import { PUBLIC_AVAILABILITY_ENABLED } from '../constants/feature-flags';
import type { PublicUnit } from '../data/customerAvailability';
import { supabase } from '../lib/supabase';

export type PublicAvailabilityError =
  | 'pending_approval'
  | 'validation'
  | 'connectivity'
  | 'unavailable';

export type PublicAvailabilityResult = {
  units: PublicUnit[];
  error: PublicAvailabilityError | null;
};

// This is the only customer availability data path. The RPC returns public
// unit identifiers, types and a boolean, never reservation or staff rows.
export async function getPublicAvailability(
  arrival: string,
  departure: string
): Promise<PublicAvailabilityResult> {
  if (!PUBLIC_AVAILABILITY_ENABLED) {
    return { units: [], error: 'pending_approval' };
  }
  try {
    const { data, error, status } = await supabase.rpc('ranch_available_units', {
      p_arrival: arrival,
      p_departure: departure,
    });
    if (error) {
      return {
        units: [],
        error: error.code === '22023' ? 'validation' : status === 0 ? 'connectivity' : 'unavailable',
      };
    }
    if (!Array.isArray(data)) return { units: [], error: 'unavailable' };
    const units: PublicUnit[] = [];
    for (const row of data) {
      if (typeof row?.unit_id !== 'string' || typeof row?.stay_type !== 'string' ||
          typeof row?.is_available !== 'boolean') {
        return { units: [], error: 'unavailable' };
      }
      units.push({ unitId: row.unit_id, stayType: row.stay_type, isAvailable: row.is_available });
    }
    return { units, error: null };
  } catch {
    return { units: [], error: 'connectivity' };
  }
}
