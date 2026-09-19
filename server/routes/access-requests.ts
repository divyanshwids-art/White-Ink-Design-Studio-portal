import { Router, Response } from 'express';
import { db, Role, AccessRequestStatus } from '../db.ts';
import {
  requireAuth,
  requireRoles,
  AuthenticatedRequest,
  sanitizeUser,
  hashPassword,
  generateStrongPassword,
} from '../auth.ts';

export const accessRequestsRouter = Router();

// POST /api/access-requests (public, no auth)
accessRequestsRouter.post('/', async (req, res) => {
  try {
    const { name, email, requestedRole, companyName } = req.body;

    if (!name || !email || !requestedRole) {
      return res.status(400).json({ message: 'Name, email, and requested role are required.' });
    }

    if (requestedRole !== 'ADMIN') {
      return res.status(400).json({
        message: 'Invalid requested role. Only Admin staff access requests are permitted.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = db.getUserByEmail(cleanEmail);
    if (existingUser) {
      return res.status(409).json({ message: 'A user account with this email address already exists.' });
    }

    // Check if there is already an active pending request for this email
    const pendingRequest = db
      .getAccessRequests('PENDING')
      .find((r) => r.email.toLowerCase() === cleanEmail);
    if (pendingRequest) {
      return res.status(409).json({
        message: 'An access request for this email is already pending review by our Super Admin.',
      });
    }

    const newRequest = db.createAccessRequest({
      name: name.trim(),
      email: cleanEmail,
      requestedRole: 'ADMIN',
      companyName: null,
      status: 'PENDING',
    });

    return res.status(201).json({
      message:
        'Your access request has been submitted. Our Super Admin will review it and share your login credentials with you separately.',
      request: newRequest,
    });
  } catch (error: any) {
    console.error('Error submitting access request:', error);
    return res.status(500).json({ message: 'Internal server error while processing access request.' });
  }
});

// GET /api/access-requests (SUPER_ADMIN only)
accessRequestsRouter.get(
  '/',
  requireAuth,
  requireRoles(['SUPER_ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status } = req.query;
      const requests = db.getAccessRequests(typeof status === 'string' ? status : undefined);

      // Map reviewer details if available
      const mapped = requests.map((r) => {
        const reviewer = r.reviewedById ? db.getUserById(r.reviewedById) : null;
        return {
          ...r,
          reviewedBy: reviewer ? sanitizeUser(reviewer) : null,
        };
      });

      // Sort newest first
      mapped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return res.json(mapped);
    } catch (error: any) {
      console.error('Error fetching access requests:', error);
      return res.status(500).json({ message: 'Failed to fetch access requests.' });
    }
  }
);

// POST /api/access-requests/:id/approve (SUPER_ADMIN only)
accessRequestsRouter.post(
  '/:id/approve',
  requireAuth,
  requireRoles(['SUPER_ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const currentUser = req.user!;
      const { id } = req.params;

      const accessRequest = db.getAccessRequestById(id);
      if (!accessRequest) {
        return res.status(404).json({ message: 'Access request not found.' });
      }

      if (accessRequest.status !== 'PENDING') {
        return res.status(409).json({
          message: `Cannot approve request with current status: ${accessRequest.status}.`,
        });
      }

      const cleanEmail = accessRequest.email.trim().toLowerCase();
      const existingUser = db.getUserByEmail(cleanEmail);
      if (existingUser) {
        return res.status(409).json({
          message: 'An active user account with this email address already exists.',
        });
      }

      if (accessRequest.requestedRole === 'ADMIN') {
        const adminCount = db.getUsers().filter((u) => u.role === 'ADMIN').length;
        if (adminCount >= 1) {
          return res.status(409).json({
            message: 'Only 1 Admin is allowed in the portal. An Admin account already exists.',
          });
        }
      }

      // Auto-generate strong random password (12 characters)
      const plaintextPassword = generateStrongPassword(12);
      const passwordHash = await hashPassword(plaintextPassword);
      const now = new Date().toISOString();

      // Create authorized User account with mustChangePassword: true (Admins must change on first login)
      const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newUser = db.createUser({
        id: userId,
        name: accessRequest.name.trim(),
        email: cleanEmail,
        passwordHash,
        role: accessRequest.requestedRole,
        clientId: null,
        profileImage: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(accessRequest.name.trim())}`,
        mustChangePassword: true,
      });

      // Update AccessRequest status to APPROVED
      const updatedRequest = db.updateAccessRequest(id, {
        status: 'APPROVED',
        reviewedById: currentUser.id,
        reviewedAt: now,
      });

      // Store generated plaintext credentials in IssuedCredential vault
      const issuedCred = db.upsertIssuedCredential({
        userId: newUser.id,
        email: cleanEmail,
        plaintextPassword,
        createdById: currentUser.id,
      });

      return res.status(200).json({
        message: 'Access request approved successfully and user account generated.',
        user: sanitizeUser(newUser),
        plaintextPassword,
        accessRequest: updatedRequest,
        credentialId: issuedCred.id,
      });
    } catch (error: any) {
      console.error('Error approving access request:', error);
      return res.status(500).json({ message: 'Internal server error while approving request.' });
    }
  }
);

// POST /api/access-requests/:id/reject (SUPER_ADMIN only)
accessRequestsRouter.post(
  '/:id/reject',
  requireAuth,
  requireRoles(['SUPER_ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const currentUser = req.user!;
      const { id } = req.params;
      const { reason } = req.body;

      const accessRequest = db.getAccessRequestById(id);
      if (!accessRequest) {
        return res.status(404).json({ message: 'Access request not found.' });
      }

      if (accessRequest.status !== 'PENDING') {
        return res.status(409).json({
          message: `Cannot reject request with current status: ${accessRequest.status}.`,
        });
      }

      const updatedRequest = db.updateAccessRequest(id, {
        status: 'REJECTED',
        rejectionReason: reason && reason.trim() ? reason.trim() : 'Request declined by Super Admin.',
        reviewedById: currentUser.id,
        reviewedAt: new Date().toISOString(),
      });

      return res.status(200).json({
        message: 'Access request has been rejected.',
        accessRequest: updatedRequest,
      });
    } catch (error: any) {
      console.error('Error rejecting access request:', error);
      return res.status(500).json({ message: 'Internal server error while rejecting request.' });
    }
  }
);
