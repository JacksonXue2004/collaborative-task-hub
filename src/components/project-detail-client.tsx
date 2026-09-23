'use client';

import { useActionState } from 'react';
import { deleteProjectAction, inviteMemberAction } from '@/server/actions/project.actions';
import { toast } from 'sonner';
import { useState } from 'react';
import { Trash2, Users, UserPlus, X } from 'lucide-react';
import Link from 'next/link';

type ProjectMember = {
  role: string;
  user: { id: string; name: string | null; email: string };
};

type Project = {
  id: string;
  name: string;
  members: ProjectMember[];
};

export function ProjectDetailClient({ project }: { project: Project }) {
  const [inviteState, inviteFormAction, invitePending] = useActionState(inviteMemberAction, null);
  const [deleteState, deleteFormAction, deletePending] = useActionState(deleteProjectAction, null);
  const [showInvite, setShowInvite] = useState(false);

  const isOwner = project.members.some(
    (m) => m.role === 'OWNER' && m.user.email === undefined // placeholder — actual check on server
  );
  // We determine ownership by checking if there's an OWNER role in the list
  // The actual permission check happens server-side in the actions
  const canManage = true; // UI-level display; actual enforcement is server-side

  // Side effects for action states
  if (inviteState?.success) {
    toast.success('Member invited successfully');
    setTimeout(() => window.location.reload(), 500);
  }
  if (inviteState && !inviteState.success) {
    toast.error(inviteState.error.message);
  }
  if (deleteState?.success) {
    toast.success('Project deleted');
    setTimeout(() => (window.location.href = '/dashboard'), 800);
  }
  if (deleteState && !deleteState.success) {
    toast.error(deleteState.error.message);
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => setShowInvite(true)}
        className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <UserPlus className="h-4 w-4" />
        Invite
      </button>
      <Link
        href={`/projects/${project.id}/members`}
        className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <Users className="h-4 w-4" />
        Members
      </Link>

      <form action={deleteFormAction}>
        <input type="hidden" name="projectId" value={project.id} />
        <button
          type="submit"
          disabled={deletePending}
          className="flex items-center gap-1 rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </form>

      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Invite Member</h2>
              <button onClick={() => setShowInvite(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form action={inviteFormAction} className="space-y-4">
              <input type="hidden" name="projectId" value={project.id} />
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="user@example.com"
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <p className="mt-1 text-xs text-slate-500">
                  The user must already be registered in the system.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInvite(false)}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={invitePending}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {invitePending ? 'Inviting...' : 'Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
