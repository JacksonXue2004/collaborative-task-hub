// Task detail page — Server Component.
import { notFound } from 'next/navigation';
import { getTask } from '@/server/services/task.service';
import { TaskEditForm } from '@/components/task-edit-form';
import { CommentList } from '@/components/comment-list';
import { getProject } from '@/server/services/project.service';

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string; taskId: string }>;
}) {
  const { taskId } = await params;

  try {
    const task = await getTask(taskId);
    const project = await getTaskProject(task.project?.id ?? '');

    return (
      <div className="space-y-8">
        <header>
          <a
            href={`/projects/${task.project?.id}`}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            ← Back to project
          </a>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">{task.title}</h1>
        </header>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            <TaskEditForm task={task} members={project?.members.map((m) => m.user) ?? []} />
            <CommentList taskId={taskId} initialComments={task.comments} />
          </div>

          <aside className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-medium text-slate-500">Metadata</h3>
              <dl className="mt-3 space-y-3 text-sm">
                <div>
                  <dt className="text-slate-500">Created</dt>
                  <dd className="text-slate-900">{new Date(task.createdAt).toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Updated</dt>
                  <dd className="text-slate-900">{new Date(task.updatedAt).toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Version</dt>
                  <dd className="text-slate-900">v{task.version}</dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </div>
    );
  } catch (err) {
    console.error(err);
    notFound();
  }
}

// Helper to get project members for the task assignee dropdown
async function getTaskProject(projectId: string) {
  return await getProject(projectId);
}
