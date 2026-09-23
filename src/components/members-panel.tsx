'use client';

import { useActionState } from 'react';
import { inviteMemberAction, removeMemberAction } from '@/server/actions/project.actions';
import { toast } from 'sonner';
import { useState } from 'react';
import { UserPlus, X } from 'lucide-react';

type Member = {
  role: string;
  user: { id: string; name: string | null; email: string };
};

export function MembersPanel({
  projectId,
  initialMembers,
}: {
  projectId: string;
  initialMembers: Member[];
}) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [inviteState, inviteFormAction, invitePending] = useActionState(inviteMemberAction, null);
  const [removeState, removeFormAction, removePending] = useActionState(removeMemberAction, null);
  const [showInvite, setShowInvite] = useState(false);

  // Side effects
  if (inviteState?.success) {
    toast.success('Member invited successfully');
    setTimeout(() => window.location.reload(), 500);
  }
  if (inviteState && !inviteState.success) {
    toast.error(inviteState.error.message);
  }
  if (removeState?.success) {
    toast.success('Member removed');
    setTimeout(() => window.location.reload(), 500);
  }
  if (removeState && !removeState.success) {
    toast.error(removeState.error.message);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Team Members</h2>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Invite Member
        </button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Member
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Role
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {members.map((member) => (
              <tr key={member.user.id}>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm font-medium text-slate-900">
                    {member.user.name || member.user.email}
                  </div>
                  <div className="text-sm text-slate-500">{member.user.email}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    member.role === 'OWNER'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {member.role}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  {member.role !== 'OWNER' && (
                    <form action={removeFormAction} className="inline-block">
                      <input type="hidden" name="projectId" value={projectId} />
                      <input type="hidden" name="userId" value={member.user.id} />
                      <button
                        type="submit"
                        disabled={removePending}
                        className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
              <input type="hidden" name="projectId" value={projectId} />
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
