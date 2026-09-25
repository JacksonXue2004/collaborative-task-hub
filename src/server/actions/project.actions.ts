// Server Action — Project operations (thin adapter).
// Server Actions must NOT contain business logic. They only:
//   1. read form data,
//   2. call the shared service layer,
//   3. map errors to ActionState for client-side toast handling.
//
// Why both Server Actions and REST Handlers exist? Server Actions provide
// progressive enhancement for our Web UI (works even without JS). REST
// Handlers expose the same logic to third-party integrations / external clients.
'use server';

import { createProject, deleteProject } from '../services/project.service';
import { inviteMember, removeMember } from '../services/member.service';
import type { ActionState } from '../lib/types';
import { AppError } from '../lib/errors';

export async function createProjectAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    const data = {
      name: String(formData.get('name') ?? ''),
      description: formData.get('description')
        ? String(formData.get('description'))
        : undefined,
    };
    const project = await createProject(data);
    return {
      success: true,
      data: project,
      message: 'Project created successfully',
    };
  } catch (err) {

    if (err instanceof AppError) {
      return { success: false, error: { code: err.code, message: err.message } };
    }
    console.error('[createProjectAction]', err);
    return {
      success: false,
      error: { code: 'UNKNOWN', message: 'Failed to create project' },
    };
  }
}

export async function deleteProjectAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    const projectId = String(formData.get('projectId') ?? '');
    await deleteProject(projectId);
    return { success: true, data: null, message: 'Project deleted' };
  } catch (err) {
    if (err instanceof AppError) {
      return { success: false, error: { code: err.code, message: err.message } };
    }
    console.error('[deleteProjectAction]', err);
    return {
      success: false,
      error: { code: 'UNKNOWN', message: 'Failed to delete project' },
    };
  }
}

export async function inviteMemberAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    const projectId = String(formData.get('projectId') ?? '');
    const email = String(formData.get('email') ?? '');
    const member = await inviteMember(projectId, { email });
    return {
      success: true,
      data: member,
      message: 'Member invited successfully',
    };
  } catch (err) {
    if (err instanceof AppError) {
      return { success: false, error: { code: err.code, message: err.message } };
    }
    console.error('[inviteMemberAction]', err);
    return {
      success: false,
      error: { code: 'UNKNOWN', message: 'Failed to invite member' },
    };
  }
}

export async function removeMemberAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    const projectId = String(formData.get('projectId') ?? '');
    const userId = String(formData.get('userId') ?? '');
    await removeMember(projectId, userId);
    return { success: true, data: null, message: 'Member removed' };
  } catch (err) {
    if (err instanceof AppError) {
      return { success: false, error: { code: err.code, message: err.message } };
    }
    console.error('[removeMemberAction]', err);
    return {
      success: false,
      error: { code: 'UNKNOWN', message: 'Failed to remove member' },
    };
  }
}
