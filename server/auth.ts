import 'dotenv/config';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db, UserRecord, Role } from './db.ts';

const rawJwtSecret = process.env.JWT_SECRET;
if (!rawJwtSecret || rawJwtSecret.trim() === '') {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing or empty. A strong secret key is required for authentication in production. Please define JWT_SECRET in your environment or .env file before starting the application.'
    );
  }
}

const JWT_SECRET: string =
  rawJwtSecret && rawJwtSecret.trim() !== ''
    ? rawJwtSecret
    : 'planforge-development-secure-jwt-secret-token-key-2026';

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
}

export interface AuthenticatedRequest extends Request {
  user?: UserRecord;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateStrongPassword(length = 12): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '!@#$%^&*()_+-=';
  const all = upper + lower + numbers + symbols;

  let pwd = '';
  pwd += upper[Math.floor(Math.random() * upper.length)];
  pwd += lower[Math.floor(Math.random() * lower.length)];
  pwd += numbers[Math.floor(Math.random() * numbers.length)];
  pwd += symbols[Math.floor(Math.random() * symbols.length)];

  for (let i = 4; i < length; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }

  // Shuffle the password
  return pwd.split('').sort(() => 0.5 - Math.random()).join('');
}

export function generateToken(user: UserRecord): string {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (err) {
    return null;
  }
}

export function sanitizeUser(user: UserRecord) {
  // Never expose passwordHash in responses
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let authHeader = (req.headers.authorization || req.headers['x-access-token']) as string | undefined;
  if (!authHeader) {
    return res.status(401).json({ message: 'Authentication required. Missing or malformed token.' });
  }

  let token = authHeader.trim();
  if (token.toLowerCase().startsWith('bearer ')) {
    token = token.slice(7).trim();
  }
  // Sanitize wrapping single or double quotes
  token = token.replace(/^["']|["']$/g, '').trim();

  if (!token) {
    return res.status(401).json({ message: 'Authentication required. Missing or malformed token.' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }

  let user = db.getUserById(payload.userId);
  if (!user && payload.email) {
    user = db.getUserByEmail(payload.email);
  }
  if (!user) {
    return res.status(401).json({ message: 'User account not found.' });
  }

  req.user = user;
  next();
}

export function requireRoles(allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden: Access restricted. Requires one of roles: [${allowedRoles.join(', ')}]`,
      });
    }

    next();
  };
}
