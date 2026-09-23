// Server Action — Comment operations (thin adapter).
'use server';

import { createComment } from '../services/comment.service';
import type { ActionState } from '../lib/types';
import { AppError } from '../lib/errors';

export async function addCommentAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    const taskId = String(formData.get('taskId') ?? '');
    const content = String(formData.get('content') ?? '');
    const comment = await createComment(taskId, { content });
    return { success: true, data: comment, message: 'Comment added' };
  } catch (err) {
    if (err instanceof AppError) {
      return { success: false, error: { code: err.code, message: err.message } };
    }
    console.error('[addCommentAction]', err);
    return {
      success: false,
      error: { code: 'UNKNOWN', message: 'Failed to add comment' },
    };
  }
}
