import { supabase } from '../lib/supabase';

export type RanchUnit = {
  id: string;
  stayType: string;
};

export type InventoryRepositoryError = 'permission' | 'unavailable';

export type InventoryRepositoryResult = {
  units: RanchUnit[];
  error: InventoryRepositoryError | null;
};

function isPermissionError(error: { code?: string; status?: number }) {
  return (
    error.code === '42501' ||
    error.code === 'PGRST301' ||
    error.status === 401 ||
    error.status === 403
  );
}

export async function listStaffInventory(): Promise<InventoryRepositoryResult> {
  const { data, error } = await supabase
    .from('ranch_units')
    .select('id, stay_type')
    .order('id');

  if (error) {
    return {
      units: [],
      error: isPermissionError(error) ? 'permission' : 'unavailable',
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
