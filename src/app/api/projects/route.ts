// REST Route Handler — Projects. Thin adapter only.
// All business logic lives in server/services/project.service.ts.
// This handler only: parse payload → call service → format HTTP response.
import { NextRequest } from 'next/server';
import { listProjects, createProject } from '../../../server/services/project.service';
import { jsonResponse, errorResponse } from '../../../server/lib/api-response';
import { AppError } from '../../../server/lib/errors';

export const GET = async (_req: NextRequest) => {
  try {
    const projects = await listProjects();
    return jsonResponse({ data: projects });
  } catch (err) {
    return errorResponse(err);
  }
};

export const POST = async (req: NextRequest) => {
  try {
    const body = await req.json();
    const project = await createProject(body);
    return jsonResponse({ data: project }, 201);
  } catch (err) {
    return errorResponse(err);
  }
};
