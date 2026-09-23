'use client';

import { useActionState } from 'react';
import { addCommentAction } from '@/server/actions/comment.actions';
import { toast } from 'sonner';
import { useState } from 'react';

type Comment = {
  id: string;
  content: string;
  author: { id: string; name: string | null; email: string };
  createdAt: Date;
};

export function CommentList({
  taskId,
  initialComments,
}: {
  taskId: string;
  initialComments: Comment[];
}) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [state, formAction, isPending] = useActionState(addCommentAction, null);

  // Handle add comment side effects
  if (state?.success) {
    toast.success(state.message || 'Comment added');
    setTimeout(() => window.location.reload(), 300);
  }
  if (state && !state.success) {
    toast.error(state.error.message);
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Comments</h2>

      <div className="space-y-4 mb-6">
        {comments.length === 0 ? (
          <p className="text-sm text-slate-500">No comments yet. Be the first to comment.</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="border-l-2 border-slate-200 pl-4 py-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-slate-900">
                  {comment.author.name || comment.author.email}
                </span>
                <span className="text-slate-400">
                  {new Date(comment.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{comment.content}</p>
            </div>
          ))
        )}
      </div>

      <form action={formAction} className="border-t border-slate-200 pt-4">
        <input type="hidden" name="taskId" value={taskId} />
        <textarea
          id="content"
          name="content"
          rows={3}
          required
          placeholder="Write a comment..."
          className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isPending ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </form>
    </div>
  );
}
