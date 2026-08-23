import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const validConfig = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    FRONTEND_ORIGIN: 'http://localhost:3000',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    STORAGE_ENDPOINT: 'http://localhost:9000',
    STORAGE_BUCKET: 'sms-uploads',
    STORAGE_ACCESS_KEY_ID: 'test-access-key',
    STORAGE_SECRET_ACCESS_KEY: 'test-secret-key',
    STORAGE_PUBLIC_URL_BASE: 'http://localhost:9000/sms-uploads',
    PAYSTACK_SECRET_KEY: 'sk_test_abc123',
    TERMII_API_KEY: 'test-termii-key',
    RESEND_API_KEY: 'test-resend-key',
  };

  it('accepts a valid config and applies defaults', () => {
    const result = validateEnv(validConfig);
    expect(result.NODE_ENV).toBe('development');
    expect(result.PORT).toBe(4000);
    expect(result.DATABASE_URL).toBe(validConfig.DATABASE_URL);
    expect(result.JWT_ACCESS_EXPIRES_IN).toBe('15m');
    expect(result.JWT_REFRESH_EXPIRES_IN).toBe('7d');
  });

  it('coerces a numeric PORT string', () => {
    const result = validateEnv({ ...validConfig, PORT: '5000' });
    expect(result.PORT).toBe(5000);
  });

  it('throws a clear error when DATABASE_URL is missing', () => {
    expect(() =>
      validateEnv({ ...validConfig, DATABASE_URL: undefined }),
    ).toThrow(/DATABASE_URL/);
  });

  it('throws when FRONTEND_ORIGIN is missing', () => {
    expect(() =>
      validateEnv({ ...validConfig, FRONTEND_ORIGIN: undefined }),
    ).toThrow(/FRONTEND_ORIGIN/);
  });

  it('throws when JWT_ACCESS_SECRET is too short', () => {
    expect(() =>
      validateEnv({ ...validConfig, JWT_ACCESS_SECRET: 'too-short' }),
    ).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('throws when JWT_REFRESH_SECRET is missing', () => {
    expect(() =>
      validateEnv({ ...validConfig, JWT_REFRESH_SECRET: undefined }),
    ).toThrow(/JWT_REFRESH_SECRET/);
  });

  it('throws when STORAGE_BUCKET is missing', () => {
    expect(() =>
      validateEnv({ ...validConfig, STORAGE_BUCKET: undefined }),
    ).toThrow(/STORAGE_BUCKET/);
  });

  it('defaults STORAGE_FORCE_PATH_STYLE to true and coerces the string', () => {
    expect(validateEnv(validConfig).STORAGE_FORCE_PATH_STYLE).toBe(true);
    expect(
      validateEnv({ ...validConfig, STORAGE_FORCE_PATH_STYLE: 'false' })
        .STORAGE_FORCE_PATH_STYLE,
    ).toBe(false);
  });

  it('throws when PAYSTACK_SECRET_KEY is missing', () => {
    expect(() =>
      validateEnv({ ...validConfig, PAYSTACK_SECRET_KEY: undefined }),
    ).toThrow(/PAYSTACK_SECRET_KEY/);
  });

  it('defaults PAYSTACK_BASE_URL to the real Paystack API', () => {
    expect(validateEnv(validConfig).PAYSTACK_BASE_URL).toBe(
      'https://api.paystack.co',
    );
  });

  it('throws when TERMII_API_KEY is missing', () => {
    expect(() =>
      validateEnv({ ...validConfig, TERMII_API_KEY: undefined }),
    ).toThrow(/TERMII_API_KEY/);
  });

  it('defaults TERMII_SENDER_ID and TERMII_BASE_URL', () => {
    const result = validateEnv(validConfig);
    expect(result.TERMII_SENDER_ID).toBe('DemoSchool');
    expect(result.TERMII_BASE_URL).toBe('https://v3.api.termii.com');
  });

  it('throws when RESEND_API_KEY is missing', () => {
    expect(() =>
      validateEnv({ ...validConfig, RESEND_API_KEY: undefined }),
    ).toThrow(/RESEND_API_KEY/);
  });

  it('defaults EMAIL_FROM', () => {
    expect(validateEnv(validConfig).EMAIL_FROM).toBe('noreply@demoschool.ng');
  });
});
