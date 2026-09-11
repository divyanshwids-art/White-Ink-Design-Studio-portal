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
      className={`p-5 rounded-2xl border transition-all duration-200 ${
        todo.completed
          ? 'bg-[#FAF7F2]/60 border-[#EDE7DD] opacity-75'
          : 'bg-white border-[#EDE7DD] shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:border-[#BA954F]/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3.5">
        {/* Checkbox and Content */}
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          {/* Complete Toggle Checkbox */}
          <button
            type="button"
            onClick={() => onToggle(todo)}
            className={`mt-0.5 shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
              todo.completed
                ? 'bg-[#BA954F] border-[#BA954F] text-white shadow-2xs'
                : 'border-[#DFD5C6] hover:border-[#BA954F] bg-[#FAF7F2]'
            }`}
            title={todo.completed ? 'Mark as pending' : 'Mark as completed'}
          >
            {todo.completed && <Check className="h-3.5 w-3.5 stroke-[3]" />}
          </button>

          {/* Text details */}
          <div className="min-w-0 flex-1">
            <h4
              className={`text-sm font-semibold text-neutral-900 break-words ${
                todo.completed ? 'line-through text-neutral-400' : ''
              }`}
            >
              {todo.title}
            </h4>

            {todo.description && (
              <p
                className={`text-xs text-neutral-500 mt-1 whitespace-pre-line break-words leading-relaxed ${
                  todo.completed ? 'text-neutral-400' : ''
                }`}
              >
                {todo.description}
              </p>
            )}

            {/* Badges / Meta row */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {/* Due Date Badge */}
              {hasDueDate && (
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                    todo.completed
                      ? 'bg-neutral-100 text-neutral-400 border-neutral-200'
                      : isOverdue
                      ? 'bg-[#FDF0ED] text-[#9E2A2B] border-[#F5D0C5] font-semibold'
                      : isDueToday
                      ? 'bg-[#FDF6E9] text-[#B45309] border-[#F9E2AF] font-semibold'
                      : 'bg-[#FAF7F2] text-[#BA954F] border-[#EDE7DD]'
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
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#FAF7F2] text-[#BA954F] border border-[#EDE7DD]">
                  <UserCheck className="h-3 w-3 text-[#BA954F] shrink-0" />
                  <span>
                    {isAssignee ? (
                      <>
                        Assigned by <strong className="font-semibold text-neutral-900">{todo.createdBy?.name || 'Colleague'}</strong>
                      </>
                    ) : (
                      <>
                        Assigned to <strong className="font-semibold text-neutral-900">{todo.assignedTo.name}</strong>
                      </>
                    )}
                  </span>
                </span>
              )}

              {/* Personal Tag if unassigned */}
              {!todo.assignedTo && isOwner && (
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-[#FAF7F2] text-neutral-500 border border-[#EDE7DD]">
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
              className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-[#FAF7F2] rounded-lg transition-colors cursor-pointer"
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
              className="p-1.5 text-neutral-400 hover:text-[#9E2A2B] hover:bg-[#FDF0ED] rounded-lg transition-colors cursor-pointer"
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
