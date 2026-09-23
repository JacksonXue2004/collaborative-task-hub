// Server Action — Task operations (thin adapter).
'use server';

import { createTask, updateTask, deleteTask } from '../services/task.service';
import type { ActionState } from '../lib/types';
import { AppError } from '../lib/errors';

export async function createTaskAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    const projectId = String(formData.get('projectId') ?? '');
    const payload = extractTaskPayload(formData);
    const task = await createTask(projectId, payload);
    return { success: true, data: task, message: 'Task created' };
  } catch (err) {
    if (err instanceof AppError) {
      return { success: false, error: { code: err.code, message: err.message } };
    }
    console.error('[createTaskAction]', err);
    return {
      success: false,
      error: { code: 'UNKNOWN', message: 'Failed to create task' },
    };
  }
}

export async function updateTaskAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    const taskId = String(formData.get('taskId') ?? '');
    const payload = extractTaskPayload(formData, true);
    const task = await updateTask(taskId, payload);
    return { success: true, data: task, message: 'Task updated' };
  } catch (err) {
    if (err instanceof AppError) {
      // Conflict (409) gets a specific code so the UI can suggest page refresh.
      return {
        success: false,
        error: {
          code: err.code,
          message: err.code === 'CONFLICT'
            ? 'This task was modified by another user. Please refresh the page and try again.'
            : err.message,
        },
      };
    }
    console.error('[updateTaskAction]', err);
    return {
      success: false,
      error: { code: 'UNKNOWN', message: 'Failed to update task' },
    };
  }
}

export async function deleteTaskAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    const taskId = String(formData.get('taskId') ?? '');
    await deleteTask(taskId);
    return { success: true, data: null, message: 'Task deleted' };
  } catch (err) {
    if (err instanceof AppError) {
      return { success: false, error: { code: err.code, message: err.message } };
    }
    console.error('[deleteTaskAction]', err);
    return {
      success: false,
      error: { code: 'UNKNOWN', message: 'Failed to delete task' },
    };
  }
}

function extractTaskPayload(formData: FormData, includeVersion = false) {
  const payload: Record<string, unknown> = {};
  const title = formData.get('title');
  if (title !== null) payload.title = String(title);
  const description = formData.get('description');
  if (description !== null) payload.description = String(description);
  const status = formData.get('status');
  if (status) payload.status = String(status);
  const priority = formData.get('priority');
  if (priority) payload.priority = String(priority);
  const assignToUserId = formData.get('assignToUserId');
  if (assignToUserId !== null) payload.assignToUserId = String(assignToUserId) || null;
  const dueDate = formData.get('dueDate');
  if (dueDate !== null) payload.dueDate = String(dueDate) || null;
  if (includeVersion) {
    const version = formData.get('version');
    if (version) payload.version = Number(version);
  }
  return payload;
}
