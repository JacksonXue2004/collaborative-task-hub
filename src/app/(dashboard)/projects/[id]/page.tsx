// Project detail page — Server Component.
// Fetches project info, stats, and task list, then renders.
import { getProject, getProjectStats } from '@/server/services/project.service';
import { listTasks } from '@/server/services/task.service';
import { ProjectDetailClient } from '@/components/project-detail-client';
import { TaskList } from '@/components/task-list';
import { TaskCreateForm } from '@/components/task-create-form';
import { StatsCard } from '@/components/stats-card';
import { notFound } from 'next/navigation';

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const queries = await searchParams;

  try {
    const project = await getProject(id);
    const stats = await getProjectStats(id);
    const { items, total, page, pageSize, totalPages } = await listTasks(id, queries);

    return (
      <div className="space-y-8">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{project.name}</h1>
            {project.description && (
              <p className="mt-1 text-slate-600">{project.description}</p>
            )}
            <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
              <span>Owner: {project.owner.name || project.owner.email}</span>
              <span>·</span>
              <span>{project.members.length} members</span>
            </div>
          </div>
          <ProjectDetailClient project={project} />
        </header>

        <StatsCard stats={stats} />

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Tasks</h2>
          <TaskCreateForm projectId={id} members={project.members.map((m) => m.user)} />
        </div>

        <TaskList
          tasks={items}
          total={total}
          page={page}
          pageSize={pageSize}
          totalPages={totalPages}
          projectId={id}
          members={project.members.map((m) => m.user)}
        />
      </div>
    );
  } catch (err) {
    console.error(err);
    notFound();
  }
}
