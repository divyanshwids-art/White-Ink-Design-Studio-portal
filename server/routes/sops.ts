import { Router, Response } from 'express';
import { db } from '../db.ts';
import { requireAuth, AuthenticatedRequest } from '../auth.ts';

export const sopsRouter = Router();

sopsRouter.use(requireAuth);

// GET / - List all SOPs / Brand Books with optional category and search filters
sopsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;
    const isClient = req.user?.role === 'CLIENT' || req.user?.role === 'CLIENT_ADMIN';

    let sops = db.getSOPs({ category, search });

    // If client, return their Brand Book documents and any Brand Book category documents
    if (isClient) {
      sops = sops.filter(
        (s) =>
          s.category.toLowerCase().includes('brand') ||
          s.createdById === req.user!.id ||
          (req.user?.clientId && (s as any).clientId === req.user.clientId)
      );
    }

    return res.status(200).json(sops);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to fetch documents.' });
  }
});

// GET /:id - Single SOP or Brand Book detail
sopsRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const sop = db.getSOPById(req.params.id);
    if (!sop) {
      return res.status(404).json({ message: 'Document not found.' });
    }
    return res.status(200).json(sop);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to fetch document.' });
  }
});

// POST / - Create SOP or Brand Book entry
sopsRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      title,
      category,
      content,
      version,
      tags,
      fileUrl,
      fileName,
      fileType,
      logoUrl,
      brandColors,
      typography,
      clientId,
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'title and content are required.' });
    }

    const isClient = req.user?.role === 'CLIENT' || req.user?.role === 'CLIENT_ADMIN';
    const effectiveCategory = category || (isClient ? 'Brand Book' : 'General SOP');

    const sop = db.createSOP({
      title: title.trim(),
      category: effectiveCategory,
      content: content.trim(),
      version: version || '1.0',
      tags: tags || (isClient ? 'Brand Assets, Client Upload' : ''),
      fileUrl: fileUrl || null,
      fileName: fileName || null,
      fileType: fileType || null,
      logoUrl: logoUrl || null,
      brandColors: brandColors || null,
      typography: typography || null,
      clientId: clientId || req.user?.clientId || null,
      createdById: req.user!.id,
    } as any);

    return res.status(201).json({ message: 'Document created successfully.', sop });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to create document.' });
  }
});

// PUT /:id - Update SOP or Brand Book entry
sopsRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const existing = db.getSOPById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    const isClient = req.user?.role === 'CLIENT' || req.user?.role === 'CLIENT_ADMIN';
    const isAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ADMIN';

    if (
      !isAdmin &&
      existing.createdById !== req.user!.id &&
      (!req.user?.clientId || (existing as any).clientId !== req.user.clientId)
    ) {
      return res.status(403).json({ message: 'Forbidden: You cannot edit this document.' });
    }

    const {
      title,
      category,
      content,
      version,
      tags,
      fileUrl,
      fileName,
      fileType,
      logoUrl,
      brandColors,
      typography,
    } = req.body;

    const sop = db.updateSOP(
      req.params.id,
      {
        ...(title !== undefined && { title }),
        ...(category !== undefined && { category }),
        ...(content !== undefined && { content }),
        ...(version !== undefined && { version }),
        ...(tags !== undefined && { tags }),
        ...(fileUrl !== undefined && { fileUrl }),
        ...(fileName !== undefined && { fileName }),
        ...(fileType !== undefined && { fileType }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(brandColors !== undefined && { brandColors }),
        ...(typography !== undefined && { typography }),
      } as any,
      req.user!.id
    );

    return res.status(200).json({ message: 'Document updated.', sop });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to update document.' });
  }
});

// DELETE /:id - Delete SOP or Brand Book entry
sopsRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const existing = db.getSOPById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    const isClient = req.user?.role === 'CLIENT' || req.user?.role === 'CLIENT_ADMIN';
    const isAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ADMIN';

    if (
      !isAdmin &&
      existing.createdById !== req.user!.id &&
      (!req.user?.clientId || (existing as any).clientId !== req.user.clientId)
    ) {
      return res.status(403).json({ message: 'Forbidden: You cannot delete this document.' });
    }

    const success = db.deleteSOP(req.params.id, req.user!.id);
    if (!success) {
      return res.status(404).json({ message: 'Document not found.' });
    }
    return res.status(200).json({ message: 'Document deleted.' });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to delete document.' });
  }
});

