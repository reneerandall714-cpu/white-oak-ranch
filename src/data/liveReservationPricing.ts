import { calculateStayPricing, type RVServiceName, type StayPricing } from './ranchConfig.ts';

type StayPricingInput = Parameters<typeof calculateStayPricing>[0];

export const calculateLiveStayPricing = calculateStayPricing;

// Current staff writes still target the existing database rate constraints.
// Use website rates after the matching SQL is verified in the target database.
export function calculateStaffStayPricing(input: StayPricingInput): StayPricing {
  const pricing = calculateStayPricing(input);
  if (process.env.EXPO_PUBLIC_WEBSITE_RATES_VERIFIED === 'true') return pricing;

  const deluxe = input.stayType === 'RV Site' && input.rvService === 'Deluxe';
  const nightlyRate = deluxe ? 50 : input.stayType === 'Small Rental RV' ? 75
    : input.stayType === 'Large Rental RV' ? 99 : pricing.nightlyRate;
  const weeklyBlocks = deluxe ? pricing.weeklyBlocks : 0;
  const weeklyBlockTotal = deluxe ? pricing.weeklyBlockTotal : 0;
  const remainingNights = Math.max(0, input.nights) - weeklyBlocks * 7;
  const remainingNightlyTotal = remainingNights * nightlyRate;
  const lodgingTotal = weeklyBlockTotal + remainingNightlyTotal;

  return {
    ...pricing,
    nightlyRate,
    weeklyBlocks,
    weeklyBlockRate: deluxe ? pricing.weeklyBlockRate : null,
    weeklyBlockTotal,
    remainingNights,
    remainingNightlyTotal,
    lodgingTotal,
    total: lodgingTotal + pricing.atvTotal,
    usesWeeklyRate: weeklyBlocks > 0,
  };
}

export function canSaveLiveReservationPricing(
  pricing: StayPricing,
  rvService: RVServiceName | undefined,
  weeklyWritesEnabled: boolean
): boolean {
  return pricing.weeklyBlocks === 0 || (weeklyWritesEnabled &&
    (rvService === 'Deluxe' || process.env.EXPO_PUBLIC_WEBSITE_RATES_VERIFIED === 'true'));
}
