import { Router, Response } from 'express';
import { db, Role } from '../db.ts';
import { hashPassword, comparePassword, generateToken, sanitizeUser, requireAuth, AuthenticatedRequest } from '../auth.ts';

export const authRouter = Router();

// POST /api/auth/register - Public registration is disabled
authRouter.post('/register', (_req, res) => {
  return res.status(403).json({
    message: 'Public registration is disabled. Please contact an administrator.',
  });
});

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = db.getUserByEmail(email.trim());
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = generateToken(user);
    const safeUser = sanitizeUser(user);
    const mustChangePassword = user.mustChangePassword ?? false;

    return res.json({
      token,
      user: {
        ...safeUser,
        mustChangePassword,
      },
      mustChangePassword,
      message: 'Login successful.',
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error during login.' });
  }
});

// GET /api/auth/me
authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const safeUser = sanitizeUser(req.user);
  return res.json({
    user: {
      ...safeUser,
      mustChangePassword: req.user.mustChangePassword ?? false,
    },
  });
});

// POST /api/auth/change-password
authRouter.post('/change-password', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUser = req.user!;

    if (currentUser.role === 'CLIENT' || currentUser.role === 'CLIENT_ADMIN') {
      return res.status(403).json({
        message: 'Clients cannot change their own password. Please contact your account administrator.',
      });
    }

    const { currentPassword, newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: 'New password is required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
    }

    // If forced first login, skip current password check (or verify if supplied)
    if (!currentUser.mustChangePassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required.' });
      }
      const isMatch = await comparePassword(currentPassword, currentUser.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect.' });
      }
    } else if (currentPassword) {
      const isMatch = await comparePassword(currentPassword, currentUser.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect.' });
      }
    }

    const newPasswordHash = await hashPassword(newPassword);
    const updated = db.updateUser(currentUser.id, {
      passwordHash: newPasswordHash,
      mustChangePassword: false,
    });
    if (!updated) {
      return res.status(500).json({ message: 'Failed to update password.' });
    }

    db.upsertIssuedCredential({
      userId: currentUser.id,
      email: currentUser.email,
      plaintextPassword: newPassword,
      createdById: currentUser.id,
    });

    return res.json({
      message: 'Password updated successfully.',
      user: sanitizeUser(updated),
    });
  } catch (error: any) {
    console.error('Change password error:', error);
    return res.status(500).json({ message: 'Internal server error during password change.' });
  }
});
