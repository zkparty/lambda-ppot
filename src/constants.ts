export const REGION = process.env.REGION;
export const EMAILS_TABLE = process.env.EMAILS_TABLE;
export const EMAIL_FROM = process.env.EMAIL_FROM;
export const EMAIL_RETURN = process.env.EMAIL_RETURN;
export const TOKEN_WEB_PAGE = process.env.TOKEN_WEB_PAGE;

export const JWT_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY;
export const JWT_EXPIRATION_TIME = parseInt(process.env.JWT_EXPIRATION_TIME);

export const TRIES_LIMIT = parseInt(process.env.TRIES_LIMIT);
export const TIME_TO_EXPIRE_SPAM = parseInt(process.env.TIME_TO_EXPIRE_SPAM);
export const TIME_TO_EXPIRE_CONFIRMED_EMAIL = parseInt(process.env.TIME_TO_EXPIRE_CONFIRMED_EMAIL);

export const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
export const S3_PREFIX = process.env.S3_PREFIX;
export const RETRIEVAL_TYPE = process.env.RETRIEVAL_TYPE;
export const DAYS_TO_RESTORE = parseInt(process.env.DAYS_TO_RESTORE);

export const HEADERS = {
    "Access-Control-Allow-Headers" : "Content-Type",
    "Access-Control-Allow-Origin": process.env.ACCESS_CONTROL_ALLOW_ORIGIN,
    "Access-Control-Allow-Methods": process.env.ACCESS_CONTROL_ALLOW_METHODS
}