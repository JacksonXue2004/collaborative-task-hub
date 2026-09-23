// Dashboard home page — lists projects for the current user.
import { listProjects } from '@/server/services/project.service';
import Link from 'next/link';
import { ProjectCreateForm } from '@/components/project-create-form';
import { FolderKanban } from 'lucide-react';

export default async function ProjectsPage() {
  const projects = await listProjects();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Projects</h1>
          <p className="mt-1 text-slate-600">
            Manage your team projects and tasks.
          </p>
        </div>
        <ProjectCreateForm />
      </div>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-16 text-center">
          <FolderKanban className="mx-auto h-16 w-16 text-slate-300" />
          <h3 className="mt-4 text-lg font-medium text-slate-900">
            No projects yet
          </h3>
          <p className="mt-2 text-slate-500">
            Create your first project to start managing tasks with your team.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="group rounded-lg border border-slate-200 bg-white p-5 hover:border-indigo-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {project.name}
                </h3>
              </div>
              {project.description && (
                <p className="mt-2 text-sm text-slate-600 line-clamp-3">
                  {project.description}
                </p>
              )}
              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Owner: {project.owner.name || project.owner.email}
                </span>
                <span>{new Date(project.createdAt).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
