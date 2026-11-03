import { PUBLIC_AVAILABILITY_ENABLED } from '../constants/feature-flags';
import { normalizePublicUnits, type PublicUnit } from '../data/customerAvailability';
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
    const units = normalizePublicUnits(data);
    if (!units) return { units: [], error: 'unavailable' };
    return { units, error: null };
  } catch {
    return { units: [], error: 'connectivity' };
  }
}
