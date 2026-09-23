// Clerk <SignIn/> requires a catch-all route because its multi-step flow
// (email → verification code → continue) navigates to sub-paths like
// /sign-in/factor-one. The [[...rest]] optional catch-all matches both
// /sign-in and any nested path beneath it.
'use client';

import { SignIn } from '@clerk/nextjs';

export const dynamic = 'force-dynamic';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="rounded-xl bg-white p-8 shadow-sm">
        <SignIn />
      </div>
    </div>
  );
}
