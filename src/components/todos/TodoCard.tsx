import React from 'react';
import { PersonalTodo } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  Check,
  Calendar,
  Clock,
  User,
  UserCheck,
  Edit2,
  Trash2,
  AlertCircle,
} from 'lucide-react';

interface TodoCardProps {
  todo: PersonalTodo;
  onToggle: (todo: PersonalTodo) => void;
  onEdit: (todo: PersonalTodo) => void;
  onDelete: (todo: PersonalTodo) => void;
}

export const TodoCard: React.FC<TodoCardProps> = ({
  todo,
  onToggle,
  onEdit,
  onDelete,
}) => {
  const { user } = useAuth();
  const isOwner = user?.id === todo.createdById;
  const isAssignee = user?.id === todo.assignedToId;

  // Due date calculations
  const hasDueDate = Boolean(todo.dueDate);
  const dueDateObj = todo.dueDate ? new Date(todo.dueDate) : null;
  const isOverdue =
    dueDateObj &&
    !todo.completed &&
    new Date(dueDateObj.toDateString()) < new Date(new Date().toDateString());
  const isDueToday =
    dueDateObj &&
    !todo.completed &&
    new Date(dueDateObj.toDateString()).getTime() === new Date(new Date().toDateString()).getTime();

  return (
    <div
      className={`p-4 rounded-xl border transition-all duration-200 ${
        todo.completed
          ? 'bg-gold-50/50 border-gold-200 opacity-80'
          : 'bg-white border-gold-300 shadow-xs hover:border-gold-400 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Checkbox and Content */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Complete Toggle Checkbox */}
          <button
            type="button"
            onClick={() => onToggle(todo)}
            className={`mt-0.5 shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
              todo.completed
                ? 'bg-gold-500 border-gold-600 text-black shadow-2xs'
                : 'border-gold-400 hover:border-gold-600 bg-white hover:bg-gold-100/50'
            }`}
            title={todo.completed ? 'Mark as pending' : 'Mark as completed'}
          >
            {todo.completed && <Check className="h-3.5 w-3.5 stroke-[3]" />}
          </button>

          {/* Text details */}
          <div className="min-w-0 flex-1">
            <h4
              className={`text-sm font-bold text-black break-words ${
                todo.completed ? 'line-through text-black/50' : ''
              }`}
            >
              {todo.title}
            </h4>

            {todo.description && (
              <p
                className={`text-xs text-black/70 mt-1 whitespace-pre-line break-words font-medium ${
                  todo.completed ? 'text-black/40' : ''
                }`}
              >
                {todo.description}
              </p>
            )}

            {/* Badges / Meta row */}
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              {/* Due Date Badge */}
              {hasDueDate && (
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                    todo.completed
                      ? 'bg-gray-100 text-black/50 border-gray-200'
                      : isOverdue
                      ? 'bg-red-50 text-red-700 border-red-300 font-bold'
                      : isDueToday
                      ? 'bg-amber-50 text-amber-800 border-amber-300 font-bold'
                      : 'bg-gold-100 text-black border-gold-300'
                  }`}
                >
                  <Calendar className="h-3 w-3 shrink-0" />
                  <span>
                    {isOverdue && 'Overdue: '}
                    {isDueToday && 'Today: '}
                    {dueDateObj?.toLocaleDateString()}
                  </span>
                </span>
              )}

              {/* Assignment Badge */}
              {todo.assignedTo && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-gold-100 text-black border border-gold-300">
                  <UserCheck className="h-3 w-3 text-gold-700 shrink-0" />
                  <span>
                    {isAssignee ? (
                      <>
                        Assigned by <strong className="font-bold">{todo.createdBy?.name || 'Colleague'}</strong>
                      </>
                    ) : (
                      <>
                        Assigned to <strong className="font-bold">{todo.assignedTo.name}</strong>
                      </>
                    )}
                  </span>
                </span>
              )}

              {/* Personal Tag if unassigned */}
              {!todo.assignedTo && isOwner && (
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-white text-black/60 border border-gold-200">
                  Personal
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Edit (Owner only) */}
          {isOwner && (
            <button
              type="button"
              onClick={() => onEdit(todo)}
              className="p-1.5 text-black/70 hover:text-black hover:bg-gold-100 rounded-lg transition-colors cursor-pointer"
              title="Edit Todo"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Delete (Owner only) */}
          {isOwner && (
            <button
              type="button"
              onClick={() => onDelete(todo)}
              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              title="Delete Todo"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
