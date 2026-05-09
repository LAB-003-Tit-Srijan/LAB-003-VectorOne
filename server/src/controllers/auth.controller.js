import { OAuth2Client } from 'google-auth-library';
import mongoose from 'mongoose';
import { User } from '../models/User.model.js';
import { hashPassword, comparePassword } from '../utils/password.util.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.util.js';
import {
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  GOOGLE_CLIENT_ID,
  isProduction,
} from '../config/env.js';

function authMisconfigured(res) {
  return res.status(503).json({
    error: 'Authentication is not configured (JWT secrets missing). Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET.',
  });
}

function issueTokens(user) {
  const accessToken = signAccessToken(user._id.toString(), {
    ver: user.tokenVersion,
    email: user.email,
  });
  const refreshToken = signRefreshToken(user._id.toString(), user.tokenVersion);
  return { accessToken, refreshToken };
}

export async function postRegister(req, res) {
  if (!JWT_ACCESS_SECRET || !JWT_REFRESH_SECRET) return authMisconfigured(res);

  const { email, password, name } = req.body ?? {};
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'email is required.' });
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'password must be at least 8 characters.' });
  }

  try {
    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      email: email.toLowerCase().trim(),
      passwordHash,
      name: typeof name === 'string' ? name.trim() : '',
    });

    const { accessToken, refreshToken } = issueTokens(user);
    return res.status(201).json({
      user: user.toSafeJSON(),
      accessToken,
      refreshToken,
    });
  } catch (err) {
    if (err instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    console.error('[auth/register]', err);
    return res.status(500).json({ error: 'Registration failed.' });
  }
}

export async function postLogin(req, res) {
  if (!JWT_ACCESS_SECRET || !JWT_REFRESH_SECRET) return authMisconfigured(res);

  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required.' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const { accessToken, refreshToken } = issueTokens(user);
    return res.json({
      user: user.toSafeJSON(),
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error('[auth/login]', err);
    return res.status(500).json({ error: 'Login failed.' });
  }
}

export async function postGoogle(req, res) {
  if (!JWT_ACCESS_SECRET || !JWT_REFRESH_SECRET) return authMisconfigured(res);
  if (!GOOGLE_CLIENT_ID) {
    return res.status(503).json({ error: 'Google Sign-In is not configured (GOOGLE_CLIENT_ID).' });
  }

  const raw = req.body?.credential;
  const credential = typeof raw === 'string' ? raw.trim() : '';
  if (!credential) {
    return res.status(400).json({ error: 'credential (Google ID token) is required.' });
  }

  try {
    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      return res.status(401).json({ error: 'Google token missing email.' });
    }
    if (payload.email_verified === false) {
      return res.status(401).json({ error: 'Google email is not verified.' });
    }

    const email = payload.email.toLowerCase().trim();
    const googleId = payload.sub;
    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (!user) {
      user = await User.create({
        email,
        googleId,
        name: payload.name ?? '',
        picture: payload.picture ?? null,
      });
    } else {
      if (!user.googleId) user.googleId = googleId;
      if (payload.picture && !user.picture) user.picture = payload.picture;
      if (payload.name && !user.name) user.name = payload.name;
      await user.save();
    }

    const { accessToken, refreshToken } = issueTokens(user);
    return res.json({
      user: user.toSafeJSON(),
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error('[auth/google]', err);
    const msg = err instanceof Error ? err.message : String(err);

    if (/Wrong number of segments|malformed/i.test(msg)) {
      return res.status(400).json({
        error: 'Invalid credential payload. Retry Google sign-in.',
      });
    }
    if (/audience|Audience|recipient/i.test(msg)) {
      return res.status(401).json({
        error:
          'Google token audience mismatch. Use the same Web OAuth Client ID in server GOOGLE_CLIENT_ID and client VITE_GOOGLE_CLIENT_ID.',
      });
    }
    if (/expired|Expired/i.test(msg)) {
      return res.status(401).json({
        error: 'Google sign-in expired. Close the popup and try again.',
      });
    }

    return res.status(401).json({
      error:
        'Google authentication failed. Check Cloud Console: OAuth Web client, Authorized JavaScript origins include your app URL (e.g. http://localhost:5173).',
    });
  }
}

export async function postRefresh(req, res) {
  if (!JWT_ACCESS_SECRET || !JWT_REFRESH_SECRET) return authMisconfigured(res);

  const { refreshToken } = req.body ?? {};
  if (!refreshToken || typeof refreshToken !== 'string') {
    return res.status(400).json({ error: 'refreshToken is required.' });
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);
    const userId = decoded.sub;
    const ver = decoded.ver;
    if (!userId || typeof ver !== 'number') {
      return res.status(401).json({ error: 'Invalid refresh token.' });
    }

    const user = await User.findById(userId);
    if (!user || user.tokenVersion !== ver) {
      return res.status(401).json({ error: 'Refresh token revoked or invalid.' });
    }

    const tokens = issueTokens(user);
    return res.json(tokens);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unauthorized';
    return res.status(401).json({ error: msg.includes('expired') ? 'Refresh token expired.' : 'Invalid refresh token.' });
  }
}

export async function getMe(req, res) {
  try {
    const user = await User.findById(req.authUserId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.json({ user: user.toSafeJSON() });
  } catch (err) {
    console.error('[auth/me]', err);
    return res.status(500).json({ error: 'Failed to load profile.' });
  }
}

export async function postLogout(req, res) {
  try {
    await User.updateOne({ _id: req.authUserId }, { $inc: { tokenVersion: 1 } });
    return res.json({ ok: true });
  } catch (err) {
    console.error('[auth/logout]', err);
    return res.status(500).json({ error: 'Logout failed.' });
  }
}
