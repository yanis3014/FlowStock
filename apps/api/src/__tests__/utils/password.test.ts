import { hashPassword, comparePassword, validatePasswordStrength } from '../../utils/password';

describe('Password Utilities', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'Test1234';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(20); // bcrypt hash is long
    });

    it('should produce different hashes for same password', async () => {
      const password = 'Test1234';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      // bcrypt includes salt, so hashes should be different
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('comparePassword', () => {
    it('should return true for correct password', async () => {
      const password = 'Test1234';
      const hash = await hashPassword(password);
      
      const isValid = await comparePassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'Test1234';
      const hash = await hashPassword(password);
      
      const isValid = await comparePassword('WrongPassword', hash);
      expect(isValid).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should accept valid password', () => {
      const result = validatePasswordStrength('Test1234');
      expect(result.valid).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should reject password shorter than 8 characters', () => {
      const result = validatePasswordStrength('Test123');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('8 characters');
    });

    it('should reject password without uppercase', () => {
      const result = validatePasswordStrength('test1234');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('uppercase');
    });

    it('should reject password without lowercase', () => {
      const result = validatePasswordStrength('TEST1234');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('lowercase');
    });

    it('should reject password without digit', () => {
      const result = validatePasswordStrength('TestAbcd');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('digit');
    });
  });
});
