// Clerk <SignUp/> requires a catch-all route — see sign-in page for rationale.
'use client';

import { SignUp } from '@clerk/nextjs';

export const dynamic = 'force-dynamic';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="rounded-xl bg-white p-8 shadow-sm">
        <SignUp />
      </div>
    </div>
  );
}
