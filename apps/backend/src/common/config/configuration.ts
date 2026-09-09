export interface AppConfig {
  env: string;
  port: number;
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessTtl: number;
    refreshTtl: number;
  };
  encryptionKey: string;
  webauthn: { rpId: string; rpName: string; origin: string };
  apple: { clientId: string; issuer: string };
  google: { clientId: string };
  stripe: { secretKey: string; webhookSecret: string; platformFeeBps: number };
  aws: { region: string; bucket: string; kmsKeyId: string };
  enableDevLogin: boolean;
}

const DEV_DEFAULTS = {
  JWT_ACCESS_SECRET: 'dev_access',
  JWT_REFRESH_SECRET: 'dev_refresh',
  FIELD_ENCRYPTION_KEY: 'dev_32byte_key_dev_32byte_key_xx',
};

const cfg = (): AppConfig => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev_access',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev_refresh',
    accessTtl: parseInt(process.env.JWT_ACCESS_TTL ?? '900', 10),
    refreshTtl: parseInt(process.env.JWT_REFRESH_TTL ?? '2592000', 10),
  },
  encryptionKey: process.env.FIELD_ENCRYPTION_KEY ?? 'dev_32byte_key_dev_32byte_key_xx',
  webauthn: {
    rpId: process.env.WEBAUTHN_RP_ID ?? 'localhost',
    rpName: process.env.WEBAUTHN_RP_NAME ?? 'Pedia',
    origin: process.env.WEBAUTHN_ORIGIN ?? 'http://localhost:3000',
  },
  apple: {
    clientId: process.env.APPLE_CLIENT_ID ?? 'com.pedia.app',
    issuer: process.env.APPLE_ISSUER ?? 'https://appleid.apple.com',
  },
  google: { clientId: process.env.GOOGLE_CLIENT_ID ?? '' },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
    platformFeeBps: parseInt(process.env.STRIPE_PLATFORM_FEE_BPS ?? '2000', 10),
  },
  aws: {
    region: process.env.AWS_REGION ?? 'eu-west-1',
    bucket: process.env.S3_BUCKET ?? 'pedia-clinical-files',
    kmsKeyId: process.env.S3_KMS_KEY_ID ?? 'alias/pedia-files',
  },
  // Explicit opt-in for the password-less test login (never default-on in prod).
  enableDevLogin: process.env.ENABLE_DEV_LOGIN === 'true',
});

export default (): AppConfig => {
  // Fail fast: never run production with the built-in dev secrets — tokens
  // would be forgeable and "encrypted" clinical fields decryptable from source.
  if ((process.env.NODE_ENV ?? 'development') === 'production') {
    const weak = (Object.keys(DEV_DEFAULTS) as (keyof typeof DEV_DEFAULTS)[]).filter(
      (k) => (process.env[k] ?? DEV_DEFAULTS[k]) === DEV_DEFAULTS[k],
    );
    if (weak.length) {
      throw new Error(
        `Refusing to boot: insecure default secret(s) in production — set ${weak.join(', ')}.`,
      );
    }
  }
  return cfg();
};
