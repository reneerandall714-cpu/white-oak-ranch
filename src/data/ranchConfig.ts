export const RANCH_CONFIG = {
  ranch: {
    name: 'White Oak Ranch',
    location: 'Dunlap, Tennessee',
    phone: '931.259.1190',
  },

  inventory: {
    rvSites: 11,
    tentSites: 10,

    rentalRVs: {
      small: {
        name: 'Small Rental RV',
        sleepsMin: 4,
        sleepsMax: 5,
      },

      large: {
        name: 'Large Rental RV',
        sleepsMin: 6,
        sleepsMax: 8,
      },
    },
  },

  pricing: {
    tent: {
      nightly: 25,
      maxGuestsPerSite: 6,
    },

    rv: {
      parkingOnly: {
        name: 'Parking Only',
        nightly: 25,
        weekly: 150,
        fullHookup: false,
      },

      electricWater: {
        name: 'Electric + Water',
        nightly: 40,
        weekly: 225,
        fullHookup: false,
      },

      deluxe: {
        name: 'Deluxe',
        nightly: 50,
        weekly: 200,
        fullHookup: true,
      },
    },

    rentalRV: {
      small: {
        normal: 75,
        eventHoliday: 99,
      },

      large: {
        normal: 99,
        eventHoliday: 125,
      },
    },

    dayPass: {
      primary: 15,
      additional: 10,
      atvSxs: 50,
    },

    overnightAtvSxs: 75,

    memberships: {
      individual: 145,
      familyStartingAt: 275,
      rvWithStorageStartingAt: 1500,
    },
  },

  rvServices: {
    parkingOnly: {
      water: false,
      electric: false,
      septic: false,
      internet: false,
    },

    electricWater: {
      water: true,
      electric: true,
      septic: false,
      internet: false,
    },

    deluxe: {
      water: true,
      electric: true,
      septic: true,
      internet: true,
    },
  },

  rules: {
    allRVSitesFullHookupCapable: true,

    tentGuestLimit: 6,

    additionalTentSiteRequiredOverLimit: true,

    specialEventPricingMayApply: true,

    membershipsExclude: [
      'ATV / SxS fees',
      'ATV rentals',
      'RV rentals',
      'Other additional fees',
    ],
  },
} as const;

export const RV_SITE_NUMBERS = Array.from(
  { length: RANCH_CONFIG.inventory.rvSites },
  (_, index) => index + 1
);

export const TENT_SITE_NUMBERS = Array.from(
  { length: RANCH_CONFIG.inventory.tentSites },
  (_, index) => index + 1
);

export type RVServiceName = 'Parking Only' | 'Electric + Water' | 'Deluxe';

export type StayPricing = {
  nightlyRate: number;
  weeklyBlocks: number;
  weeklyBlockRate: number | null;
  weeklyBlockTotal: number;
  remainingNights: number;
  remainingNightlyTotal: number;
  lodgingTotal: number;
  atvTotal: number;
  total: number;
  usesWeeklyRate: boolean;
};

const RV_SERVICE_BY_NAME = {
  'Parking Only': RANCH_CONFIG.pricing.rv.parkingOnly,
  'Electric + Water': RANCH_CONFIG.pricing.rv.electricWater,
  Deluxe: RANCH_CONFIG.pricing.rv.deluxe,
} as const;

export function calculateStayPricing({
  stayType,
  rvService,
  nights,
  atvAccess = false,
}: {
  stayType: string;
  rvService?: RVServiceName;
  nights: number;
  atvAccess?: boolean;
}): StayPricing {
  const safeNights = Math.max(0, nights);
  const rvRate = stayType === 'RV Site' && rvService
    ? RV_SERVICE_BY_NAME[rvService]
    : null;
  const nightlyRate = rvRate?.nightly ?? (
    stayType === 'Tent Site'
      ? RANCH_CONFIG.pricing.tent.nightly
      : stayType === 'Small Rental RV'
        ? RANCH_CONFIG.pricing.rentalRV.small.normal
        : stayType === 'Large Rental RV'
          ? RANCH_CONFIG.pricing.rentalRV.large.normal
          : 0
  );
  const weeklyBlocks = rvRate ? Math.floor(safeNights / 7) : 0;
  const remainingNights = rvRate ? safeNights % 7 : safeNights;
  const weeklyBlockRate = rvRate && weeklyBlocks > 0 ? rvRate.weekly : null;
  const weeklyBlockTotal = weeklyBlocks * (rvRate?.weekly ?? 0);
  const remainingNightlyTotal = remainingNights * nightlyRate;
  const lodgingTotal = weeklyBlockTotal + remainingNightlyTotal;
  const atvTotal = atvAccess ? RANCH_CONFIG.pricing.overnightAtvSxs : 0;

  return {
    nightlyRate,
    weeklyBlocks,
    weeklyBlockRate,
    weeklyBlockTotal,
    remainingNights,
    remainingNightlyTotal,
    lodgingTotal,
    atvTotal,
    total: lodgingTotal + atvTotal,
    usesWeeklyRate: Boolean(rvRate?.fullHookup && weeklyBlocks > 0),
  };
}
