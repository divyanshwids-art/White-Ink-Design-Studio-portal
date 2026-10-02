import { Router, Response } from 'express';
import { db, Role } from '../db.ts';
import { requireAuth, requireRoles, AuthenticatedRequest, sanitizeUser, hashPassword, generateStrongPassword } from '../auth.ts';
import { sendUserWelcomeCredentialsEmail } from '../email.ts';

export const usersRouter = Router();

// GET /api/users/team-workload
usersRouter.get('/team-workload', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const workload = db.getAllTeamMembersWorkload();
  return res.json(workload);
});

// GET /api/users
usersRouter.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { search, role } = req.query;

  let users = db.getUsers();

  // Scoping
  if (currentUser.role === 'CLIENT' || currentUser.role === 'CLIENT_ADMIN') {
    // Client project-based scoping
    const clientProjects = db.getProjects().filter((p) => {
      const client = db.getClientById(p.clientId);
      return (
        (currentUser.clientId && p.clientId === currentUser.clientId) ||
        (client && client.email.toLowerCase() === currentUser.email.toLowerCase()) ||
        p.clientId === currentUser.id
      );
    });
    const allowedProjectIds = new Set(clientProjects.map((p) => p.id));
    const allowedUserIds = new Set<string>();

    clientProjects.forEach((p) => allowedUserIds.add(p.createdById));
    db.getAllProjectMembers().forEach((pm) => {
      if (allowedProjectIds.has(pm.projectId)) allowedUserIds.add(pm.userId);
    });
    allowedUserIds.add(currentUser.id);

    users = users.filter((u) => allowedUserIds.has(u.id));
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    users = users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }

  if (role && typeof role === 'string' && role !== 'ALL') {
    users = users.filter((u) => u.role === role);
  }

  return res.json(users.map(sanitizeUser));
});

// GET /api/users/:id
usersRouter.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = db.getUserById(id);
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }
  return res.json(sanitizeUser(user));
});

// POST /api/users (Direct member creation with auto-generated or custom passwords)
usersRouter.post(
  '/',
  requireAuth,
  requireRoles(['SUPER_ADMIN', 'ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const currentUser = req.user!;
      const { name, email, profileImage, password } = req.body;
      let requestedRole = req.body.role;

      if (!name || !email) {
        return res.status(400).json({ message: 'Name and email are required.' });
      }

      // Role determination based on hierarchy:
      let assignedRole: Role;
      let assignedClientId: string | null = null;

      if (currentUser.role === 'SUPER_ADMIN') {
        // Super Admin can create SUPER_ADMIN, ADMIN, or TEAM_MEMBER
        if (requestedRole === 'SUPER_ADMIN') {
          assignedRole = 'SUPER_ADMIN';
        } else if (requestedRole === 'TEAM_MEMBER') {
          assignedRole = 'TEAM_MEMBER';
        } else {
          assignedRole = 'ADMIN';
        }
      } else if (currentUser.role === 'ADMIN') {
        // Admin can create Team Members or other Admins
        if (requestedRole === 'ADMIN') {
          assignedRole = 'ADMIN';
        } else {
          assignedRole = 'TEAM_MEMBER';
        }
      } else {
        return res.status(403).json({ message: 'Forbidden: Direct user creation is restricted.' });
      }

      const cleanEmail = email.trim().toLowerCase();
      const existing = db.getUserByEmail(cleanEmail);
      if (existing) {
        return res.status(409).json({ message: 'An account with this email address already exists. Duplicate email is not allowed.' });
      }

      const cleanName = name.trim();
      const existingByName = db.getUserByName(cleanName);
      if (existingByName) {
        return res.status(409).json({ message: 'An account with this name already exists. Duplicate name is not allowed.' });
      }

      // Use provided password or auto-generate strong password
      const plaintextPassword =
        password && typeof password === 'string' && password.trim().length >= 6
          ? password.trim()
          : generateStrongPassword(12);
      const passwordHash = await hashPassword(plaintextPassword);
      const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const newUser = db.createUser({
        id: userId,
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        role: assignedRole,
        clientId: assignedClientId,
        profileImage: profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}`,
        mustChangePassword: password ? false : true,
      });

      // Archive generated credentials in vault
      db.upsertIssuedCredential({
        userId: newUser.id,
        email: newUser.email,
        plaintextPassword,
        createdById: currentUser.id,
      });

      // Dispatch welcome credentials email asynchronously
      sendUserWelcomeCredentialsEmail({
        toEmail: newUser.email,
        userName: newUser.name,
        role: newUser.role,
        plaintextPassword,
      }).catch((emailErr) => console.warn('[EMAIL] Welcome credentials email dispatch failed:', emailErr?.message));

      return res.status(201).json({
        ...sanitizeUser(newUser),
        generatedPassword: plaintextPassword,
      });
    } catch (error: any) {
      console.error('Error creating user:', error);
      return res.status(500).json({ message: 'Failed to create user.' });
    }
  }
);

// PATCH /api/users/:id
usersRouter.patch('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUser = req.user!;
    const { id } = req.params;
    const { name, email, role, password, profileImage } = req.body;

    const targetUser = db.getUserById(id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isSelf = currentUser.id === id;

    // Strict authorization matrix:
    if (!isSelf) {
      if (currentUser.role === 'SUPER_ADMIN') {
        // Super Admin can modify any staff or client account
      } else if (currentUser.role === 'ADMIN') {
        if (targetUser.role !== 'TEAM_MEMBER') {
          return res.status(403).json({
            message: 'Forbidden: Admins can only modify Team Member accounts.',
          });
        }
      } else {
        return res.status(403).json({ message: 'Forbidden: You cannot modify other users.' });
      }
    }

    // Role change restrictions:
    if (role && role !== targetUser.role) {
      if (isSelf) {
        return res.status(403).json({ message: 'You cannot change your own role.' });
      }
      if (currentUser.role === 'SUPER_ADMIN') {
        // Super Admin can assign any role
      } else if (currentUser.role === 'ADMIN') {
        if (role !== 'TEAM_MEMBER') {
          return res.status(403).json({
            message: 'Forbidden: Admins can only assign Team Member role.',
          });
        }
      } else {
        return res.status(403).json({ message: 'Forbidden: You cannot change user roles.' });
      }
    }

    const updates: any = {};
    if (name) {
      const cleanName = name.trim();
      if (cleanName.toLowerCase() !== targetUser.name.trim().toLowerCase()) {
        const existingByName = db.getUsers().find((u) => u.name.trim().toLowerCase() === cleanName.toLowerCase() && u.id !== id);
        if (existingByName) {
          return res.status(409).json({ message: 'An account with this name already exists. Duplicate name is not allowed.' });
        }
      }
      updates.name = cleanName;
    }
    if (email) {
      const emailClean = email.trim().toLowerCase();
      if (emailClean !== targetUser.email.toLowerCase()) {
        const emailTaken = db.getUserByEmail(emailClean);
        if (emailTaken && emailTaken.id !== id) {
          return res.status(409).json({ message: 'An account with this email address already exists. Duplicate email is not allowed.' });
        }
        updates.email = emailClean;
      }
    }
    if (role && role !== targetUser.role) {
      updates.role = role;
    }
    if (profileImage !== undefined) {
      updates.profileImage = profileImage === '' || profileImage === null ? null : profileImage;
    }
    if (req.body.skills !== undefined) {
      updates.skills = req.body.skills;
    }
    if (password && password.trim().length >= 6) {
      updates.passwordHash = await hashPassword(password);
    }

    const updatedUser = db.updateUser(id, updates);
    if (!updatedUser) {
      return res.status(500).json({ message: 'Failed to update user.' });
    }

    if (password && password.trim().length >= 6) {
      db.upsertIssuedCredential({
        userId: id,
        email: updatedUser.email,
        plaintextPassword: password.trim(),
        createdById: currentUser.id,
      });
    }

    return res.json(sanitizeUser(updatedUser));
  } catch (error: any) {
    console.error('Error updating user:', error);
    return res.status(500).json({ message: 'Failed to update user.' });
  }
});

// DELETE /api/users/:id
usersRouter.delete(
  '/:id',
  requireAuth,
  requireRoles(['SUPER_ADMIN', 'ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    const currentUser = req.user!;
    const { id } = req.params;

    if (currentUser.id === id) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }

    const targetUser = db.getUserById(id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Strict deletion authorization matrix:
    if (currentUser.role === 'SUPER_ADMIN') {
      // Super Admin can delete any account except themselves
    } else if (currentUser.role === 'ADMIN') {
      if (targetUser.role !== 'TEAM_MEMBER') {
        return res.status(403).json({
          message: 'Forbidden: Admins can only delete Team Member accounts.',
        });
      }
    } else {
      return res.status(403).json({ message: 'Forbidden: You cannot delete users.' });
    }

    const success = db.deleteUser(id);
    if (!success) {
      return res.status(500).json({ message: 'Failed to delete user.' });
    }

    return res.json({ message: 'User deleted successfully.', deletedId: id });
  }
);
