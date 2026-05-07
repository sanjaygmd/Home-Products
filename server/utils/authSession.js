import crypto from 'crypto';
import { pool } from '../configs/db.js';

export const createAuthSession = async (userId, userType, ip, device) => {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const result = await pool.query(
    `INSERT INTO auth_sessions (user_ref_id, user_type, token_hash, expires_at, last_ip, last_device, last_accessed_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     RETURNING session_id`,
    [userId, userType, tokenHash, expiresAt, ip, JSON.stringify(device)]
  );

  return {
    token,
    sessionId: result.rows[0].session_id,
    expiresAt
  };
};

export const invalidateSession = async (sessionId) => {
  await pool.query(
    'UPDATE auth_sessions SET is_blacklisted = true WHERE session_id = $1',
    [sessionId]
  );
};

export const getCookieName = (userType) => {
  if (userType === 'admin' || userType === 'super_admin') return 'admin_token';
  if (userType === 'seller') return 'seller_token';
  if (userType === 'customer') return 'customer_token';
  return 'token';
};

export const cookieConfig = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  sameSite: 'lax'
};

/**
 * Sets the role-specific session cookie and clears the generic 'token' cookie
 */
export const setSessionCookie = (res, userType, token) => {
  const name = getCookieName(userType);
  
  // Clear all potential role cookies to prevent mutually exclusive session pollution
  const clearOptions = { 
    path: '/', 
    httpOnly: true, 
    sameSite: 'lax', 
    secure: process.env.NODE_ENV === 'production' 
  };
  res.clearCookie('token', clearOptions);
  res.clearCookie('customer_token', clearOptions);
  res.clearCookie('seller_token', clearOptions);
  res.clearCookie('admin_token', clearOptions);
  res.clearCookie('super_admin_token', clearOptions);
  
  res.cookie(name, token, cookieConfig);
};
