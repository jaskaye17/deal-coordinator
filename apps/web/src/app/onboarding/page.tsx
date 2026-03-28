'use client';

import { Button, Card, Input } from '@deal-coordinator/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useWorkspace } from '@/lib/context/workspace-context';
import { api } from '@/lib/api';

const STEPS = [
  { key: 'workspace', title: 'Name your workspace', subtitle: 'This is usually your brokerage or team name.' },
  { key: 'profile', title: 'Your details', subtitle: 'Help us personalize your experience. You can update these later.' },
  { key: 'done', title: "You're all set!", subtitle: 'Your workspace is ready. Start coordinating deals.' },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { workspaceId, userId } = useWorkspace();

  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [workspaceName, setWorkspaceName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [market, setMarket] = useState('');

  useEffect(() => {
    if (!workspaceId || !userId) {
      router.replace('/login');
    }
  }, [workspaceId, userId, router]);

  if (!workspaceId || !userId) return null;

  const step = STEPS[stepIndex]!;

  async function saveAndAdvance() {
    setError('');
    setSaving(true);
    try {
      const body: Record<string, string> = { workspaceId: workspaceId! };
      if (stepIndex === 0 && workspaceName.trim()) {
        body.workspaceName = workspaceName.trim();
      }
      if (stepIndex === 1) {
        if (company.trim()) body.company = company.trim();
        if (phone.trim()) body.phone = phone.trim();
        if (licenseNumber.trim()) body.licenseNumber = licenseNumber.trim();
        if (market.trim()) body.market = market.trim();
      }

      if (Object.keys(body).length > 1) {
        await api.patch('/auth/onboarding', body);
      }

      setStepIndex((i) => i + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  function skip() {
    if (stepIndex >= STEPS.length - 1) {
      router.push('/dashboard');
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  function finish() {
    router.push('/dashboard');
  }

  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4 py-16">
      {/* Progress bar */}
      <div className="mb-8 w-full max-w-md">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Step {stepIndex + 1} of {STEPS.length}</span>
          {stepIndex < STEPS.length - 1 && (
            <button
              type="button"
              onClick={skip}
              className="text-slate-500 hover:text-slate-700"
            >
              Skip
            </button>
          )}
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-brand-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mb-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Deal Coordinator</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{step.title}</h1>
        <p className="mt-2 max-w-sm text-sm text-slate-600">{step.subtitle}</p>
      </div>

      <Card className="w-full max-w-md border-slate-200 shadow-sm">
        {step.key === 'workspace' && (
          <div className="flex flex-col gap-4">
            <Input
              label="Workspace name"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.currentTarget.value)}
              placeholder="e.g. Acme Realty, The Smith Team"
              autoFocus
            />
            <p className="text-xs text-slate-500">
              This will be the name shown to all team members. You can change it later in Settings.
            </p>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={skip}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Skip for now
              </button>
              <Button type="button" loading={saving} onClick={saveAndAdvance}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {step.key === 'profile' && (
          <div className="flex flex-col gap-4">
            <Input
              label="Company / Brokerage"
              value={company}
              onChange={(e) => setCompany(e.currentTarget.value)}
              placeholder="e.g. Keller Williams, RE/MAX"
            />
            <Input
              label="Phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.currentTarget.value)}
              placeholder="(555) 123-4567"
              autoComplete="tel"
            />
            <Input
              label="License number"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.currentTarget.value)}
              placeholder="e.g. DRE-01234567"
            />
            <Input
              label="Primary market"
              value={market}
              onChange={(e) => setMarket(e.currentTarget.value)}
              placeholder="e.g. San Francisco Bay Area"
            />
            <p className="text-xs text-slate-500">
              All fields are optional. You can update these anytime from your profile.
            </p>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={skip}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Skip for now
              </button>
              <Button type="button" loading={saving} onClick={saveAndAdvance}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {step.key === 'done' && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-green-100">
              <svg className="size-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-slate-600">
              Your workspace is configured. You can create your first deal, invite team members, or explore the dashboard.
            </p>
            <Button type="button" className="w-full" onClick={finish}>
              Go to Dashboard
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
