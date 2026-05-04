import { encryptUtf8, decryptUtf8 } from '../../utils/token-crypto';

describe('token-crypto', () => {
  it('roundtrips UTF-8 secrets', () => {
    const plain = 'square-oauth-access-token';
    const enc = encryptUtf8(plain);
    expect(enc).not.toContain(plain);
    expect(decryptUtf8(enc)).toBe(plain);
  });
});
