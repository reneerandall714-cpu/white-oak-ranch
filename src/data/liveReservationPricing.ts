import type { RVServiceName, StayPricing } from './ranchConfig';

// The applied database check accepts weekly totals only for Deluxe RV sites.
// The feature flag keeps those writes independently controllable.
export function canSaveLiveReservationPricing(
  pricing: StayPricing,
  rvService: RVServiceName | undefined,
  deluxeWeeklyWritesEnabled: boolean
): boolean {
  return pricing.weeklyBlocks === 0 ||
    (rvService === 'Deluxe' && deluxeWeeklyWritesEnabled);
}
