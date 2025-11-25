import dotenv from 'dotenv';

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    provider: (process.env.DATABASE_PROVIDER || 'sqlite') as 'sqlite' | 'mysql' | 'postgresql',
    url: process.env.DATABASE_URL || 'file:./database.db',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
};

