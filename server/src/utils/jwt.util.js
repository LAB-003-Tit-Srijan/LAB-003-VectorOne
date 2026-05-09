import jwt from 'jsonwebtoken';
import {
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN,
} from '../config/env.js';

/**
 * @param {string} userId
 * @param {{ ver?: number; email?: string }} [payload]
 */
export function signAccessToken(userId, payload = {}) {
  return jwt.sign({ sub: userId, typ: 'access', ...payload }, JWT_ACCESS_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRES_IN,
  });
}

/**
 * @param {string} userId
 * @param {number} tokenVersion
 */
export function signRefreshToken(userId, tokenVersion) {
  return jwt.sign({ sub: userId, typ: 'refresh', ver: tokenVersion }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  });
}

/**
 * @param {string} token
 */
export function verifyAccessToken(token) {
  const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
  if (decoded.typ !== 'access') throw new Error('Invalid token type');
  return decoded;
}

/**
 * @param {string} token
 */
export function verifyRefreshToken(token) {
  const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
  if (decoded.typ !== 'refresh') throw new Error('Invalid token type');
  return decoded;
}
