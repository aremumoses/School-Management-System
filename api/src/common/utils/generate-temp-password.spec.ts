import { generateTempPassword } from './generate-temp-password';

describe('generateTempPassword', () => {
  it('generates a password meeting the minimum length used by LoginDto', () => {
    const password = generateTempPassword();
    expect(password.length).toBeGreaterThanOrEqual(8);
  });

  it('never contains base64 padding/symbol characters', () => {
    for (let i = 0; i < 20; i++) {
      expect(generateTempPassword()).not.toMatch(/[+/=]/);
    }
  });

  it('generates a different value each call', () => {
    const a = generateTempPassword();
    const b = generateTempPassword();
    expect(a).not.toBe(b);
  });
});
