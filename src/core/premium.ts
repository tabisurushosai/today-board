export const PREMIUM_PRICE_USD = 3;
export const TRIAL_DAYS = 7;
export const STRIPE_PAYMENT_LINK = "STRIPE_PAYMENT_LINK_PLACEHOLDER";

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
    return {
      isPremium: false,
      isTrialActive: true,
      daysRemaining: TRIAL_DAYS,
      trialEndsAt: null,
    };
  }

  const firstOpened = new Date(params.firstOpenedAt);
  if (Number.isNaN(firstOpened.getTime())) {
    return {
      isPremium: false,
      isTrialActive: true,
      daysRemaining: TRIAL_DAYS,
      trialEndsAt: null,
    };
  }

  const trialEndsAtDate = new Date(firstOpened.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const millisecondsRemaining = trialEndsAtDate.getTime() - params.now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(millisecondsRemaining / (24 * 60 * 60 * 1000)));

  return {
    isPremium: false,
    isTrialActive: daysRemaining > 0,
    daysRemaining,
    trialEndsAt: trialEndsAtDate.toISOString(),
  };
}
