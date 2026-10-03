import { Router, Response } from 'express';
import { db } from '../db.ts';
import { requireAuth, requireRoles, AuthenticatedRequest, hashPassword, generateStrongPassword } from '../auth.ts';

export const clientsRouter = Router();

// GET /api/clients
clientsRouter.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { search } = req.query;

  let clients = db.getClients();

  // If role is CLIENT or CLIENT_ADMIN, only show their own client record
  if (currentUser.role === 'CLIENT' || currentUser.role === 'CLIENT_ADMIN') {
    clients = clients.filter(
      (c) => (currentUser.clientId && c.id === currentUser.clientId) || c.email.toLowerCase() === currentUser.email.toLowerCase() || c.id === currentUser.id
    );
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    clients = clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  }

  // Attach project count for each client
  const clientsWithStats = clients.map((c) => {
    const clientProjects = db.getProjects().filter((p) => p.clientId === c.id);
    return {
      ...c,
      projectCount: clientProjects.length,
      activeProjectCount: clientProjects.filter((p) => p.status === 'ACTIVE').length,
    };
  });

  return res.json(clientsWithStats);
});

// GET /api/clients/:id
clientsRouter.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { id } = req.params;

  const client = db.getClientById(id);
  if (!client) {
    return res.status(404).json({ message: 'Client not found.' });
  }

  // Access check for Client & Client Admin role
  if (currentUser.role === 'CLIENT' || currentUser.role === 'CLIENT_ADMIN') {
    if ((!currentUser.clientId || client.id !== currentUser.clientId) && client.email.toLowerCase() !== currentUser.email.toLowerCase() && client.id !== currentUser.id) {
      return res.status(403).json({ message: 'Forbidden: Access to this client record is restricted.' });
    }
  } else if (currentUser.role === 'TEAM_MEMBER') {
    const accessibleClientIds = db.getAccessibleClientIdsForTeamMember(currentUser.id);
    if (!accessibleClientIds.includes(id)) {
      return res.status(403).json({ message: 'Forbidden: You are not assigned to any projects for this client.' });
    }
  }

  let clientProjects = db.getProjects().filter((p) => p.clientId === id);
  if (currentUser.role === 'TEAM_MEMBER') {
    const memberProjectIds = new Set(
      db.getProjectMembersByUserId(currentUser.id).map((pm) => pm.projectId)
    );
    db.getTasks()
      .filter((t) => t.assignedToId === currentUser.id)
      .forEach((t) => memberProjectIds.add(t.projectId));
    clientProjects = clientProjects.filter((p) => memberProjectIds.has(p.id));
  }

  return res.json({
    ...client,
    projects: clientProjects,
  });
});

// POST /api/clients/with-login (SUPER_ADMIN)
clientsRouter.post(
  '/with-login',
  requireAuth,
  requireRoles(['SUPER_ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const currentUser = req.user!;
      const { name, company, email, phone, address } = req.body;

      if (!name || !company || !email) {
        return res.status(400).json({ message: 'Name, company, and email are required fields.' });
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanName = name.trim();

      // Check if client or user already exists with this email
      const existingClient = db.getClientByEmail(cleanEmail);
      if (existingClient) {
        return res.status(409).json({ message: 'An account with this email address already exists. Duplicate email is not allowed.' });
      }
      const existingUser = db.getUserByEmail(cleanEmail);
      if (existingUser) {
        return res.status(409).json({ message: 'An account with this email address already exists. Duplicate email is not allowed.' });
      }

      // Check if client or user already exists with this name
      const existingClientByName = db.getClientByName(cleanName);
      if (existingClientByName) {
        return res.status(409).json({ message: 'An account with this name already exists. Duplicate name is not allowed.' });
      }
      const existingUserByName = db.getUserByName(cleanName);
      if (existingUserByName) {
        return res.status(409).json({ message: 'An account with this name already exists. Duplicate name is not allowed.' });
      }

      // 1. Create the Client record
      const clientId = `cli_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newClient = await db.createClientAsync({
        id: clientId,
        name: cleanName,
        company: company.trim(),
        email: cleanEmail,
        phone: phone ? phone.trim() : null,
        address: address ? address.trim() : null,
      });

      // 2. Use provided password or auto-generate strong password
      const plaintextPassword =
        req.body.password && typeof req.body.password === 'string' && req.body.password.trim().length >= 6
          ? req.body.password.trim()
          : generateStrongPassword(12);
      const passwordHash = await hashPassword(plaintextPassword);

      // 3. Create User record with role CLIENT_ADMIN, linked clientId, mustChangePassword: false
      const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newUser = await db.createUserAsync({
        id: userId,
        name: cleanName,
        email: cleanEmail,
        passwordHash,
        role: 'CLIENT_ADMIN',
        clientId: newClient.id,
        profileImage: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`,
        mustChangePassword: false,
      });

      // 4. Upsert IssuedCredential record
      db.upsertIssuedCredential({
        userId: newUser.id,
        email: cleanEmail,
        plaintextPassword,
        createdById: currentUser.id,
      });

      // 5. Return created client AND generated credentials
      return res.status(201).json({
        ...newClient,
        generatedPassword: plaintextPassword,
        loginEmail: cleanEmail,
      });
    } catch (error: any) {
      console.error('Error creating client with login:', error);
      return res.status(500).json({ message: 'Failed to create client organization and login account.' });
    }
  }
);

// POST /api/clients (SUPER_ADMIN)
clientsRouter.post('/', requireAuth, requireRoles(['SUPER_ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, company, email, phone, address } = req.body;

    if (!name || !company || !email) {
      return res.status(400).json({ message: 'Name, company, and email are required fields.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    const existingEmail = db.getClientByEmail(cleanEmail) || db.getUserByEmail(cleanEmail);
    if (existingEmail) {
      return res.status(409).json({ message: 'An account with this email address already exists. Duplicate email is not allowed.' });
    }

    const existingName = db.getClientByName(cleanName) || db.getUserByName(cleanName);
    if (existingName) {
      return res.status(409).json({ message: 'An account with this name already exists. Duplicate name is not allowed.' });
    }

    const newClient = db.createClient({
      id: `cli_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: cleanName,
      company: company.trim(),
      email: cleanEmail,
      phone: phone ? phone.trim() : null,
      address: address ? address.trim() : null,
    });

    return res.status(201).json(newClient);
  } catch (error: any) {
    console.error('Error creating client:', error);
    return res.status(500).json({ message: 'Failed to create client.' });
  }
});

// PATCH /api/clients/:id
clientsRouter.patch('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUser = req.user!;
    const { id } = req.params;
    const { name, company, email, phone, address } = req.body;

    const target = db.getClientById(id);
    if (!target) {
      return res.status(404).json({ message: 'Client not found.' });
    }

    const isAdmin = currentUser.role === 'SUPER_ADMIN';
    const isOwnClient =
      (currentUser.role === 'CLIENT' || currentUser.role === 'CLIENT_ADMIN') &&
      ((currentUser.clientId && target.id === currentUser.clientId) || target.id === currentUser.id || target.email.toLowerCase() === currentUser.email.toLowerCase());
    if (!isAdmin && !isOwnClient) {
      return res.status(403).json({ message: 'Forbidden: You cannot modify this client record.' });
    }

    const updates: any = {};
    if (name) {
      const cleanName = name.trim();
      if (cleanName.toLowerCase() !== target.name.trim().toLowerCase()) {
        const existingName = db.getClients().find((c) => c.name.trim().toLowerCase() === cleanName.toLowerCase() && c.id !== id)
          || db.getUsers().find((u) => u.name.trim().toLowerCase() === cleanName.toLowerCase());
        if (existingName) {
          return res.status(409).json({ message: 'An account with this name already exists. Duplicate name is not allowed.' });
        }
      }
      updates.name = cleanName;
    }
    if (company) updates.company = company.trim();
    if (phone !== undefined) updates.phone = phone ? phone.trim() : null;
    if (address !== undefined) updates.address = address ? address.trim() : null;
    if (email) {
      const emailClean = email.trim().toLowerCase();
      if (emailClean !== target.email.toLowerCase()) {
        const existing = db.getClientByEmail(emailClean) || db.getUserByEmail(emailClean);
        if (existing && existing.id !== id) {
          return res.status(409).json({ message: 'An account with this email address already exists. Duplicate email is not allowed.' });
        }
        updates.email = emailClean;
      }
    }

    const updated = db.updateClient(id, updates);
    return res.json(updated);
  } catch (error: any) {
    console.error('Error updating client:', error);
    return res.status(500).json({ message: 'Failed to update client.' });
  }
});

// DELETE /api/clients/:id
clientsRouter.delete('/:id', requireAuth, requireRoles(['SUPER_ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const target = db.getClientById(id);
  if (!target) {
    return res.status(404).json({ message: 'Client not found.' });
  }

  const success = db.deleteClient(id);
  if (!success) {
    return res.status(500).json({ message: 'Failed to delete client.' });
  }

  return res.json({ message: 'Client and associated projects deleted successfully.', deletedId: id });
});
