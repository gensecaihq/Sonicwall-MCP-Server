import { config } from 'dotenv';

config();

export interface Config {
  sonicwall: {
    host: string;
    username: string;
    password: string;
    version: '7' | '8';
  };
  server: {
    port: number;
    transport: 'sse';
    logLevel: 'error' | 'warn' | 'info' | 'debug';
  };
  cache: {
    ttlSeconds: number;
  };
  auth?: {
    bearerToken?: string;
  };
}

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

function getNumericEnv(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a number`);
  }
  return parsed;
}

export const appConfig: Config = {
  sonicwall: {
    host: getRequiredEnv('SONICWALL_HOST'),
    username: getRequiredEnv('SONICWALL_USERNAME'),
    password: getRequiredEnv('SONICWALL_PASSWORD'),
    version: (getOptionalEnv('SONICWALL_VERSION', '7') as '7' | '8'),
  },
  server: {
    port: getNumericEnv('PORT', 3000),
    transport: 'sse',
    logLevel: (getOptionalEnv('LOG_LEVEL', 'info') as 'error' | 'warn' | 'info' | 'debug'),
  },
  cache: {
    ttlSeconds: getNumericEnv('CACHE_TTL_SECONDS', 300),
  },
  ...(process.env.MCP_BEARER_TOKEN && {
    auth: {
      bearerToken: process.env.MCP_BEARER_TOKEN,
    },
  }),
};