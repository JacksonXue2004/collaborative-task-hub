// Dashboard overview page.
// Server Component — fetches stats and renders server-side.
import Link from 'next/link';
import { listProjects } from '@/server/services/project.service';
import { FolderKanban, Plus } from 'lucide-react';
import { ProjectCreateForm } from '@/components/project-create-form';

export default async function DashboardPage() {
  const projects = await listProjects();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-2 text-slate-600">Welcome back! Here's an overview of your workspace.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <ProjectCreateForm />
      </div>

      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Your Projects</h2>
        {projects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center">
            <FolderKanban className="mx-auto h-12 w-12 text-slate-400" />
            <p className="mt-4 text-slate-500">No projects yet. Create your first project to get started.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block rounded-lg border border-slate-200 bg-white p-5 hover:border-indigo-300 hover:shadow-sm transition-colors"
              >
                <h3 className="font-semibold text-slate-900">{project.name}</h3>
                {project.description && (
                  <p className="mt-1 text-sm text-slate-600 line-clamp-2">{project.description}</p>
                )}
                <p className="mt-3 text-xs text-slate-400">
                  Owner: {project.owner.name || project.owner.email}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
