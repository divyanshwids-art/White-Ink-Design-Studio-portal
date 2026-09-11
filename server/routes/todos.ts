import { Router, Response } from 'express';
import { requireAuth, requireRoles, AuthenticatedRequest } from '../auth.ts';
import { db } from '../db.ts';

export const todosRouter = Router();

// Restrict all Todo routes to internal staff only
const internalRoles: ('SUPER_ADMIN' | 'ADMIN' | 'TEAM_MEMBER')[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'TEAM_MEMBER',
];

todosRouter.use(requireAuth);
todosRouter.use(requireRoles(internalRoles));

// GET /api/todos - Get current user's owned and assigned todos
todosRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const todos = db.getTodos(userId);
    res.json(todos);
  } catch (error: any) {
    console.error('Error fetching personal todos:', error);
    res.status(500).json({ message: 'Failed to retrieve todos' });
  }
});

// GET /api/todos/:id - Get a single todo
todosRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const todo = db.getTodoById(id);

    if (!todo) {
      return res.status(404).json({ message: 'Todo not found' });
    }

    // Ensure only owner or assignee can view this specific todo
    if (todo.createdById !== req.user!.id && todo.assignedToId !== req.user!.id) {
      return res.status(403).json({ message: 'Access denied to this personal todo' });
    }

    res.json(todo);
  } catch (error: any) {
    console.error('Error fetching todo:', error);
    res.status(500).json({ message: 'Failed to retrieve todo' });
  }
});

// POST /api/todos - Create a new personal todo
todosRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, description, dueDate, assignedToId } = req.body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ message: 'Title is required' });
    }

    // Validate assignee if provided
    if (assignedToId) {
      const target = db.getUserById(assignedToId);
      if (!target) {
        return res.status(400).json({ message: 'Selected assignee user does not exist' });
      }
      if (target.role === 'CLIENT' || target.role === 'CLIENT_ADMIN') {
        return res.status(400).json({
          message: 'Personal todos cannot be assigned to clients or client administrators',
        });
      }
    }

    const todo = db.createTodo({
      title: title.trim(),
      description: description ? String(description).trim() : null,
      dueDate: dueDate || null,
      createdById: req.user!.id,
      assignedToId: assignedToId || null,
    });

    res.status(201).json({
      message: 'Todo created successfully',
      todo,
    });
  } catch (error: any) {
    console.error('Error creating todo:', error);
    res.status(500).json({ message: 'Failed to create todo' });
  }
});

// PUT /api/todos/:id - Update an existing todo (Owner only for metadata)
todosRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, dueDate, assignedToId, completed } = req.body;

    const existing = db.getTodoById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Todo not found' });
    }

    // Only original creator can edit metadata / assignment
    if (existing.createdById !== req.user!.id) {
      return res.status(403).json({
        message: 'Forbidden: Only the original creator can edit this Todo item',
      });
    }

    if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
      return res.status(400).json({ message: 'Title cannot be empty' });
    }

    // Validate new assignee if provided
    if (assignedToId) {
      const target = db.getUserById(assignedToId);
      if (!target) {
        return res.status(400).json({ message: 'Selected assignee user does not exist' });
      }
      if (target.role === 'CLIENT' || target.role === 'CLIENT_ADMIN') {
        return res.status(400).json({
          message: 'Personal todos cannot be assigned to clients or client administrators',
        });
      }
    }

    const updated = db.updateTodo(
      id,
      {
        title,
        description,
        dueDate,
        assignedToId,
        completed,
      },
      req.user!.id
    );

    if (!updated) {
      return res.status(500).json({ message: 'Failed to update todo' });
    }

    res.json({
      message: 'Todo updated successfully',
      todo: updated,
    });
  } catch (error: any) {
    console.error('Error updating todo:', error);
    res.status(500).json({ message: 'Failed to update todo' });
  }
});

// PATCH /api/todos/:id/toggle - Toggle completion status (Creator or Assignee)
todosRouter.patch('/:id/toggle', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = db.getTodoById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Todo not found' });
    }

    if (existing.createdById !== req.user!.id && existing.assignedToId !== req.user!.id) {
      return res.status(403).json({
        message: 'Forbidden: You are neither the creator nor the assignee of this Todo',
      });
    }

    const updated = db.toggleTodo(id, req.user!.id);
    if (!updated) {
      return res.status(500).json({ message: 'Failed to toggle todo status' });
    }

    res.json({
      message: `Todo marked as ${updated.completed ? 'completed' : 'pending'}`,
      todo: updated,
    });
  } catch (error: any) {
    console.error('Error toggling todo:', error);
    res.status(500).json({ message: 'Failed to toggle todo' });
  }
});

// DELETE /api/todos/:id - Delete todo (Creator only)
todosRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = db.getTodoById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Todo not found' });
    }

    // Strictly enforce personal ownership
    if (existing.createdById !== req.user!.id) {
      return res.status(403).json({
        message: 'Forbidden: You can only delete your own created Todos',
      });
    }

    const success = db.deleteTodo(id, req.user!.id);
    if (!success) {
      return res.status(500).json({ message: 'Failed to delete todo' });
    }

    res.json({ message: 'Todo deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting todo:', error);
    res.status(500).json({ message: 'Failed to delete todo' });
  }
});
