import 'dotenv/config';

const required = [
  'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME',
  'API_KEY_SITE', 'API_KEY_BOT'
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  port:    parseInt(process.env.PORT) || 3001,
  isDev:   process.env.NODE_ENV !== 'production',

  db: {
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name:     process.env.DB_NAME,
  },

  apiKeys: {
    site: process.env.API_KEY_SITE,
    bot:  process.env.API_KEY_BOT,
  },

  requestCooldownHours: parseInt(process.env.REQUEST_COOLDOWN_HOURS) || 24,

  allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean),
};
