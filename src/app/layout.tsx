import type { Metadata } from 'next';
import './globals.css';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'Collaborative Task Hub',
  description: 'Team workspace for task management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <ClerkProvider>
        <body className="min-h-screen bg-slate-50 text-slate-900">
          {children}
          <Toaster />
        </body>
      </ClerkProvider>
    </html>
  );
}
