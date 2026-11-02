import { supabase } from '../lib/supabase';
import { mapReservationAccessError, type ReservationAccessError } from './reservation-request';

export type RanchUnit = {
  id: string;
  stayType: string;
};

export type InventoryRepositoryError = ReservationAccessError;

export type InventoryRepositoryResult = {
  units: RanchUnit[];
  error: InventoryRepositoryError | null;
};

export async function listStaffInventory(): Promise<InventoryRepositoryResult> {
  const { data, error, status } = await supabase
    .from('ranch_units')
    .select('id, stay_type')
    .order('id');

  if (error) {
    return {
      units: [],
      error: mapReservationAccessError(error, status),
    };
  }

  return {
    units: (data ?? []).map((unit) => ({
      id: unit.id,
      stayType: unit.stay_type,
    })),
    error: null,
  };
}
