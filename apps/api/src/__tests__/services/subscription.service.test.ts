import {
  getFeaturesForTier,
  tierSatisfies,
  type SubscriptionTier,
} from '../../services/subscription.service';

describe('subscription.service', () => {
  describe('getFeaturesForTier', () => {
    it('should return normal tier features', () => {
      const features = getFeaturesForTier('normal');
      expect(features.ai_predictions).toBe(false);
      expect(features.smart_orders).toBe(false);
      expect(features.photo_invoice).toBe(false);
      expect(features.auto_orders).toBe(false);
      expect(features.history_days).toBe(30);
    });

    it('should return premium tier features', () => {
      const features = getFeaturesForTier('premium');
      expect(features.ai_predictions).toBe(true);
      expect(features.smart_orders).toBe(true);
      expect(features.photo_invoice).toBe(false);
      expect(features.auto_orders).toBe(false);
      expect(features.history_days).toBe(90);
    });

    it('should return premium_plus tier features', () => {
      const features = getFeaturesForTier('premium_plus');
      expect(features.ai_predictions).toBe(true);
      expect(features.smart_orders).toBe(true);
      expect(features.photo_invoice).toBe(true);
      expect(features.auto_orders).toBe(true);
      expect(features.history_days).toBe(365);
    });
  });

  describe('tierSatisfies', () => {
    it('should allow premium when required is premium', () => {
      expect(tierSatisfies('premium', ['premium'])).toBe(true);
      expect(tierSatisfies('premium_plus', ['premium'])).toBe(true);
    });

    it('should deny normal when required is premium', () => {
      expect(tierSatisfies('normal', ['premium'])).toBe(false);
    });

    it('should allow premium_plus when required is premium_plus', () => {
      expect(tierSatisfies('premium_plus', ['premium_plus'])).toBe(true);
    });

    it('should deny premium when required is premium_plus', () => {
      expect(tierSatisfies('premium', ['premium_plus'])).toBe(false);
    });

    it('should allow when required tiers include multiple and tenant satisfies min', () => {
      expect(tierSatisfies('premium', ['premium', 'premium_plus'])).toBe(true);
      expect(tierSatisfies('premium_plus', ['premium', 'premium_plus'])).toBe(true);
    });

    it('should return true when requiredTiers is empty', () => {
      expect(tierSatisfies('normal', [])).toBe(true);
    });
  });
});
