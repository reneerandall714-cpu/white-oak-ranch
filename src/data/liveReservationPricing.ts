import { calculateStayPricing, type RVServiceName, type StayPricing } from './ranchConfig.ts';

// Non-Deluxe weekly prices remain in the demo configuration. The live table
// validates those stays at their nightly rate; only Deluxe has a weekly total.
export function calculateLiveStayPricing(input: {
  stayType: string;
  rvService?: RVServiceName;
  nights: number;
  atvAccess?: boolean;
}): StayPricing {
  const configured = calculateStayPricing(input);
  if (input.stayType !== 'RV Site' || input.rvService === 'Deluxe' || configured.weeklyBlocks === 0) {
    return configured;
  }
  const remainingNightlyTotal = input.nights * configured.nightlyRate;
  const lodgingTotal = remainingNightlyTotal;
  return {
    ...configured,
    weeklyBlocks: 0,
    weeklyBlockRate: null,
    weeklyBlockTotal: 0,
    remainingNights: input.nights,
    remainingNightlyTotal,
    lodgingTotal,
    total: lodgingTotal + configured.atvTotal,
    usesWeeklyRate: false,
  };
}

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
