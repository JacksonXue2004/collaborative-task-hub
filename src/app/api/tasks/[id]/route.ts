// REST Route Handler — Single task update (optimistic lock enforced here).
// Endpoint: PATCH /api/tasks/[id]
// The version field MUST be supplied in the request body.
import { NextRequest } from 'next/server';
import { updateTask, deleteTask, getTask } from '../../../../server/services/task.service';
import { jsonResponse, errorResponse } from '../../../../server/lib/api-response';

export const GET = async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;
    const task = await getTask(id);
    return jsonResponse({ data: task });
  } catch (err) {
    return errorResponse(err);
  }
};

export const PATCH = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const task = await updateTask(id, body);
    return jsonResponse({ data: task });
  } catch (err) {
    return errorResponse(err);
  }
};

export const DELETE = async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;
    await deleteTask(id);
    return jsonResponse(null, 204);
  } catch (err) {
    return errorResponse(err);
  }
};
