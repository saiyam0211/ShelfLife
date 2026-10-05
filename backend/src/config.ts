// Fail startup when a required variable is missing.
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const jwtSecret = required('JWT_SECRET');
if (jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must have 32 characters or more');
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  mongodbUri: required('MONGODB_URI'),
  jwtSecret,
  // One or more allowed browser origins, separated by commas.
  frontendOrigins: required('FRONTEND_ORIGIN')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};
