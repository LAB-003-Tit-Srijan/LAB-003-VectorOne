import mongoose from 'mongoose';
import { verifyAccessToken } from '../utils/jwt.util.js';
import { User } from '../models/User.model.js';

export function requireMongo(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: 'Database unavailable. Set MONGODB_URI to enable authentication.',
    });
  }
  next();
}

/**
 * Verifies Bearer JWT and attaches req.authUserId.
 */
export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization ?? '';
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    if (!match) {
      return res.status(401).json({
        error:
          'Missing Authorization header. Use: Authorization: Bearer <accessToken> (from /api/auth/login or /api/auth/register).',
      });
    }

    const rawToken = match[1].trim();
    if (!rawToken) {
      return res.status(401).json({ error: 'Bearer token is empty. Export TOKEN from the login JSON response.' });
    }

    const decoded = verifyAccessToken(rawToken);
    const userId = decoded.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Invalid token payload.' });
    }

    const user = await User.findById(userId).select('tokenVersion email').lean();
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    if (
      typeof decoded.ver !== 'number' ||
      decoded.ver !== user.tokenVersion
    ) {
      return res.status(401).json({ error: 'Session revoked or outdated token. Sign in again.' });
    }

    req.authUserId = userId;
    req.authUser = user;
    next();
  } catch (err) {
    const name = err && typeof err === 'object' && 'name' in err ? String(err.name) : '';

    if (name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Access token expired. POST /api/auth/refresh with refreshToken or log in again.' });
    }

    if (name === 'JsonWebTokenError') {
      return res.status(401).json({
        error:
          'Invalid JWT (wrong signature or malformed). Log in again, copy accessToken exactly (no quotes/spaces). If you restarted the server, ensure JWT_ACCESS_SECRET is unchanged.',
      });
    }

    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('Invalid token type')) {
      return res.status(401).json({ error: 'Wrong token type: use the accessToken from login, not refreshToken.' });
    }

    return res.status(401).json({
      error: msg.includes('expired') ? 'Access token expired.' : msg || 'Unauthorized.',
    });
  }
}
