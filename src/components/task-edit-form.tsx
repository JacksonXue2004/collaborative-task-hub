'use client';

import { useActionState } from 'react';
import { updateTaskAction, deleteTaskAction } from '@/server/actions/task.actions';
import { toast } from 'sonner';
import Link from 'next/link';

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  version: number;
  project?: { id: string; name: string } | null;
  assignee: { id: string; name: string | null; email: string } | null;
};

type Member = { id: string; name: string | null; email: string };

export function TaskEditForm({ task, members }: { task: Task; members: Member[] }) {
  const [updateState, updateFormAction, updatePending] = useActionState(updateTaskAction, null);
  const [deleteState, deleteFormAction, deletePending] = useActionState(deleteTaskAction, null);

  // Handle update side effects
  if (updateState?.success) {
    toast.success('Task updated successfully');
    setTimeout(() => window.location.reload(), 500);
  }
  if (updateState && !updateState.success) {
    toast.error(updateState.error.message);
  }

  // Handle delete side effects
  if (deleteState?.success) {
    toast.success('Task deleted');
    setTimeout(() => (window.location.href = `/projects/${task.project?.id ?? ''}`), 800);
  }
  if (deleteState && !deleteState.success) {
    toast.error(deleteState.error.message);
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Task Details</h2>

      <form action={updateFormAction} className="space-y-4">
        <input type="hidden" name="taskId" value={task.id} />
        {/* Hidden version field for optimistic locking */}
        <input type="hidden" name="version" value={task.version} />

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-700">
            Title
          </label>
          <input
            id="title"
            name="title"
            defaultValue={task.title}
            required
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={task.description ?? ''}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-slate-700">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={task.status}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
            </select>
          </div>

          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-slate-700">
              Priority
            </label>
            <select
              id="priority"
              name="priority"
              defaultValue={task.priority}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="assignToUserId" className="block text-sm font-medium text-slate-700">
            Assignee
          </label>
          <select
            id="assignToUserId"
            name="assignToUserId"
            defaultValue={task.assignee?.id ?? ''}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name || m.email}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="dueDate" className="block text-sm font-medium text-slate-700">
            Due Date
          </label>
          <input
            id="dueDate"
            name="dueDate"
            type="date"
            defaultValue={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
          <button
            type="submit"
            disabled={updatePending}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {updatePending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      <div className="mt-4 pt-4 border-t border-slate-200">
        <form action={deleteFormAction}>
          <input type="hidden" name="taskId" value={task.id} />
          <button
            type="submit"
            disabled={deletePending}
            className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
          >
            {deletePending ? 'Deleting...' : 'Delete Task'}
          </button>
        </form>
      </div>
    </div>
  );
}
