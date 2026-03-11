/**
 * Constantes d'abonnement alignées avec le backend (subscription.service.ts).
 * Les valeurs API sont normal, premium, premium_plus.
 */

export const SUBSCRIPTION_TIERS = {
  normal: 'normal',
  premium: 'premium',
  premium_plus: 'premium_plus',
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

/** Labels d'affichage (séparés des valeurs API) */
export const TIER_LABELS: Record<SubscriptionTier, string> = {
  normal: 'Starter',
  premium: 'Growth',
  premium_plus: 'Scale',
};
