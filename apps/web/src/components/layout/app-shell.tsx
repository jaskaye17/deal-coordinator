'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/top-bar';
import { PhoneSimulatorProvider } from '@/lib/context/phone-simulator-context';
import { PhoneSimulatorOverlay } from '@/components/phone-simulator/phone-simulator-overlay';
import { useWorkspace } from '@/lib/context/workspace-context';

function titleForPath(pathname: string): string {
  if (pathname === '/dashboard') return 'Dashboard';
  if (pathname === '/deals') return 'Deals';
  if (pathname === '/files') return 'Files';
  if (pathname === '/settings') return 'Settings';
  if (pathname === '/review-queue') return 'Review Queue';
  if (pathname === '/templates') return 'Templates';
  if (pathname === '/integrations') return 'Integrations';
  if (pathname === '/debug') return 'Phone Simulator';
  if (pathname.startsWith('/deals/')) return 'Deal';
  return 'Deal Coordinator';
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { workspaceId, userId } = useWorkspace();
  const title = titleForPath(pathname);

  useEffect(() => {
    if (workspaceId === null && userId === null) {
      const stored = typeof window !== 'undefined' && localStorage.getItem('workspace-id');
      if (!stored) {
        router.replace('/login');
      }
    }
  }, [workspaceId, userId, router]);

  if (!workspaceId || !userId) {
    return null;
  }

  return (
    <PhoneSimulatorProvider>
      <div className="min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex min-h-screen flex-col pl-16">
          <TopBar title={title} />
          <main className="min-h-0 flex-1 overflow-auto px-6 py-6">{children}</main>
        </div>
        <PhoneSimulatorOverlay />
      </div>
    </PhoneSimulatorProvider>
  );
}
