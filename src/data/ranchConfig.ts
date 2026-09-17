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
      },

      electricWater: {
        name: 'Electric + Water',
        nightly: 40,
        weekly: 225,
      },

      deluxe: {
        name: 'Deluxe',
        nightly: 50,
        weekly: 275,
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