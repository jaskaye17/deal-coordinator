'use client';

import { Button, Card, Input } from '@deal-coordinator/ui';
import { useRouter } from 'next/navigation';
import { useState, useEffect, type FormEvent } from 'react';
import { useWorkspace } from '@/lib/context/workspace-context';
import { api } from '@/lib/api';

type Workspace = { id: string; name: string; slug: string; role: string };

type AuthResponse = {
  user: { id: string; email: string; name: string };
  workspaces: Workspace[];
  isNewUser?: boolean;
};

type AuthStep = 'login' | 'register' | 'pick-workspace';

export default function LoginPage() {
  const router = useRouter();
  const { setWorkspace } = useWorkspace();

  const [step, setStep] = useState<AuthStep>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [loggedInUser, setLoggedInUser] = useState<{ id: string; name: string } | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  // Set NEXT_PUBLIC_DEBUG_API=1 on Vercel and redeploy to print build-inlined API env in the browser console (then remove the var).
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEBUG_API === '1') {
      console.info('[deal-coordinator] build-time client env', {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      });
    }
  }, []);

  function enterWorkspace(ws: Workspace, userId: string, isNew: boolean) {
    setWorkspace(ws.id, userId);
    if (isNew) {
      router.push('/onboarding');
    } else {
      router.push('/dashboard');
    }
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post<AuthResponse>('/auth/login', { email: email.trim(), password });

      if (res.workspaces.length === 0) {
        setLoggedInUser(res.user);
        setWorkspaces([]);
        setStep('pick-workspace');
      } else if (res.workspaces.length === 1) {
        enterWorkspace(res.workspaces[0]!, res.user.id, false);
      } else {
        setLoggedInUser(res.user);
        setWorkspaces(res.workspaces);
        setStep('pick-workspace');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post<AuthResponse>('/auth/register', {
        email: email.trim(),
        name: name.trim(),
        password,
      });

      if (res.workspaces.length > 0) {
        enterWorkspace(res.workspaces[0]!, res.user.id, true);
      } else {
        setLoggedInUser(res.user);
        setWorkspaces([]);
        setStep('pick-workspace');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  function selectWorkspace(ws: Workspace) {
    if (!loggedInUser) return;
    setWorkspace(ws.id, loggedInUser.id);
    router.push('/dashboard');
  }

  if (step === 'pick-workspace') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4 py-16">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Deal Coordinator</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Welcome, {loggedInUser?.name ?? 'User'}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {workspaces.length > 0
              ? 'Select a workspace to continue'
              : 'You don\'t belong to any workspaces yet. Ask an admin to invite you.'}
          </p>
        </div>

        {workspaces.length > 0 && (
          <ul className="grid w-full max-w-lg gap-3" role="list">
            {workspaces.map((ws) => (
              <li key={ws.id}>
                <Card className="border-slate-200 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{ws.name}</p>
                      <p className="text-xs text-slate-500">Role: {ws.role} &middot; {ws.slug}</p>
                    </div>
                    <Button type="button" size="sm" onClick={() => selectWorkspace(ws)}>
                      Enter
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6">
          <button
            type="button"
            className="text-sm text-brand-600 hover:text-brand-700"
            onClick={() => {
              setStep('login');
              setLoggedInUser(null);
              setWorkspaces([]);
              setError('');
            }}
          >
            &larr; Sign in with a different account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4 py-16">
      <div className="mb-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Deal Coordinator</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          {step === 'login' ? 'Sign in' : 'Create an account'}
        </h1>
        <p className="mt-2 max-w-sm text-sm text-slate-600">
          {step === 'login'
            ? 'Enter your credentials to continue. Demo users can sign in with password "demo".'
            : 'Create a new account to get started. We\'ll set up a workspace for you automatically.'}
        </p>
      </div>

      <Card className="w-full max-w-sm border-slate-200 shadow-sm">
        <form
          className="flex flex-col gap-4"
          onSubmit={step === 'login' ? handleLogin : handleRegister}
        >
          {step === 'register' && (
            <Input
              label="Full name"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              placeholder="Jane Smith"
              autoComplete="name"
              required
            />
          )}
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            placeholder={step === 'login' ? 'Enter password' : 'Min 6 characters'}
            autoComplete={step === 'login' ? 'current-password' : 'new-password'}
            required
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" loading={loading} className="w-full">
            {step === 'login' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        <div className="mt-4 text-center">
          {step === 'login' ? (
            <button
              type="button"
              className="text-sm text-brand-600 hover:text-brand-700"
              onClick={() => { setStep('register'); setError(''); }}
            >
              Don&apos;t have an account? Create one
            </button>
          ) : (
            <button
              type="button"
              className="text-sm text-brand-600 hover:text-brand-700"
              onClick={() => { setStep('login'); setError(''); }}
            >
              Already have an account? Sign in
            </button>
          )}
        </div>
      </Card>

      <div className="mt-8 text-center">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">Demo accounts</p>
        <div className="flex flex-wrap justify-center gap-2 text-xs text-slate-500">
          <span className="rounded bg-slate-200/60 px-2 py-1">admin@demo.com</span>
          <span className="rounded bg-slate-200/60 px-2 py-1">agent@demo.com</span>
          <span className="rounded bg-slate-200/60 px-2 py-1">reviewer@demo.com</span>
          <span className="rounded bg-slate-200/60 px-2 py-1">sarah@demo.com (multi-workspace)</span>
        </div>
        <p className="mt-1 text-xs text-slate-400">Password for all: <code className="rounded bg-slate-200/60 px-1">demo</code></p>
      </div>
    </div>
  );
}
