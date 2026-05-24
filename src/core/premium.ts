export const PREMIUM_PRICE_USD = 3;
export const TRIAL_DAYS = 7;
export const STRIPE_PAYMENT_LINK = "STRIPE_PAYMENT_LINK_PLACEHOLDER";
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export type PremiumStatus = {
  isPremium: boolean;
  isTrialActive: boolean;
  daysRemaining: number;
  trialEndsAt: string | null;
};

export function getPremiumStatus(params: {
  firstOpenedAt: string | null;
  premiumPurchasedAt: string | null;
  now: Date;
}): PremiumStatus {
  if (params.premiumPurchasedAt) {
    return {
      isPremium: true,
      isTrialActive: false,
      daysRemaining: 0,
      trialEndsAt: null,
    };
  }

  if (!params.firstOpenedAt) {
    return createTrialStatus(TRIAL_DAYS);
  }

  const firstOpened = new Date(params.firstOpenedAt);
  if (Number.isNaN(firstOpened.getTime())) {
    return createTrialStatus(TRIAL_DAYS);
  }

  const trialEndsAtDate = new Date(firstOpened.getTime() + TRIAL_DAYS * MILLISECONDS_PER_DAY);
  const millisecondsRemaining = trialEndsAtDate.getTime() - params.now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(millisecondsRemaining / MILLISECONDS_PER_DAY));

  return createTrialStatus(daysRemaining, trialEndsAtDate.toISOString());
}

function createTrialStatus(daysRemaining: number, trialEndsAt: string | null = null): PremiumStatus {
  return {
    isPremium: false,
    isTrialActive: daysRemaining > 0,
    daysRemaining,
    trialEndsAt,
  };
}
