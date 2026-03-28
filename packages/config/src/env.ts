export interface EnvConfig {
  nodeEnv: string;
  appEnv: 'local' | 'staging' | 'production';
  databaseUrl: string;
  redisUrl: string;
  apiPort: number;
  apiUrl: string;
  webPort: number;
  authSecret: string;
  storageDriver: 'local' | 's3';
  storageLocalPath: string;
  s3Bucket?: string;
  s3Region?: string;
  s3AccessKey?: string;
  s3SecretKey?: string;
  s3Endpoint?: string;
  aiProvider: 'fake' | 'openai';
  openaiApiKey?: string;
}

export function getEnvConfig(): EnvConfig {
  const env = process.env;

  return {
    nodeEnv: env.NODE_ENV ?? 'development',
    appEnv: (env.APP_ENV as EnvConfig['appEnv']) ?? 'local',
    databaseUrl: env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/deal_coordinator',
    redisUrl: env.REDIS_URL ?? 'redis://localhost:6379',
    apiPort: parseInt(env.API_PORT ?? '3001', 10),
    apiUrl: env.API_URL ?? 'http://localhost:3001',
    webPort: parseInt(env.WEB_PORT ?? '3000', 10),
    authSecret: env.AUTH_SECRET ?? 'dev-secret-change-in-production',
    storageDriver: (env.STORAGE_DRIVER as EnvConfig['storageDriver']) ?? 'local',
    storageLocalPath: env.STORAGE_LOCAL_PATH ?? './tmp/storage',
    s3Bucket: env.S3_BUCKET,
    s3Region: env.S3_REGION,
    s3AccessKey: env.S3_ACCESS_KEY,
    s3SecretKey: env.S3_SECRET_KEY,
    s3Endpoint: env.S3_ENDPOINT,
    aiProvider: (env.AI_PROVIDER as EnvConfig['aiProvider']) ?? 'fake',
    openaiApiKey: env.OPENAI_API_KEY,
  };
}
