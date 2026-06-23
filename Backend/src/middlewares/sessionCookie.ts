import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { env } from '@config/env';

const SESSION_COOKIE = 'fk_sid';
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

declare module 'express-serve-static-core' {
  interface Request {
    sessionId?: string;
  }
}

// Mint a signed `fk_sid` cookie on first request and surface it as req.sessionId
// for downstream handlers (e.g. event page-view tracking).
export const sessionCookie = (req: Request, res: Response, next: NextFunction): void => {
  let sid = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (!sid) {
    sid = crypto.randomBytes(16).toString('hex');
    res.cookie(SESSION_COOKIE, sid, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      maxAge: THIRTY_DAYS,
      path: '/',
    });
  }
  req.sessionId = sid;
  next();
};
