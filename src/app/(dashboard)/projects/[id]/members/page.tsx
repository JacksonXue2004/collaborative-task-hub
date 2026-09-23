// Members management page — only project OWNER should see the full panel.
// Actual enforcement is on the server side; this is just the UI.
import { notFound } from 'next/navigation';
import { getProject } from '@/server/services/project.service';
import { requireProjectOwner } from '@/server/services/project.service';
import { MembersPanel } from '@/components/members-panel';
import { getCurrentUser } from '@/server/lib/auth';

export default async function MembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const currentUser = await getCurrentUser();
    await requireProjectOwner(id, currentUser.id);
    const project = await getProject(id);

    return (
      <div className="space-y-6">
        <header>
          <a
            href={`/projects/${id}`}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            ← Back to project
          </a>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Members — {project.name}
          </h1>
        </header>

        <MembersPanel projectId={id} initialMembers={project.members} />
      </div>
    );
  } catch (err) {
    console.error(err);
    notFound();
  }
}
