export const REGION = process.env.REGION;
export const EMAILS_TABLE = process.env.EMAILS_TABLE;
export const EMAIL_FROM = process.env.EMAIL_FROM;
export const EMAIL_RETURN = process.env.EMAIL_RETURN;

export const JWT_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY;
export const JWT_EXPIRATION_TIME = parseInt(process.env.JWT_EXPIRATION_TIME);

export const TRIES_LIMIT = parseInt(process.env.TRIES_LIMIT);
export const TIME_TO_EXPIRE_SPAM = parseInt(process.env.TIME_TO_EXPIRE_SPAM);
export const TIME_TO_EXPIRE_CONFIRMED_EMAIL = parseInt(process.env.TIME_TO_EXPIRE_CONFIRMED_EMAIL);