// REST Route Handler — Tasks under a project.
// Endpoints:
//   GET  /api/projects/[id]/tasks  — paginated + filtered list
//   POST /api/projects/[id]/tasks  — create a new task
import { NextRequest } from 'next/server';
import { createTask, listTasks } from '../../../../../server/services/task.service';
import { jsonResponse, errorResponse } from '../../../../../server/lib/api-response';

export const GET = async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;
    const url = new URL(_req.url);
    const query: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      query[key] = value;
    });
    const result = await listTasks(id, query);
    return jsonResponse({ data: result });
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
    const task = await createTask(id, body);
    return jsonResponse({ data: task }, 201);
  } catch (err) {
    return errorResponse(err);
  }
};
