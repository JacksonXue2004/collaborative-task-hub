// REST Route Handler — Comments on a task.
// Endpoint: POST /api/tasks/[id]/comments
import { NextRequest } from 'next/server';
import { createComment, listComments } from '../../../../../server/services/comment.service';
import { jsonResponse, errorResponse } from '../../../../../server/lib/api-response';

export const GET = async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;
    const comments = await listComments(id);
    return jsonResponse({ data: comments });
  } catch (err) {
    return errorResponse(err);
  }
};

export const POST = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const comment = await createComment(id, body);
    return jsonResponse({ data: comment }, 201);
  } catch (err) {
    return errorResponse(err);
  }
};
