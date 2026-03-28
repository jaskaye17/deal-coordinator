'use client';

import { Card, Button, Spinner, Tabs } from '@deal-coordinator/ui';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { AddResponsibleBrokerDrawer } from '@/components/settings/add-responsible-broker-drawer';
import { SETTINGS_FIELD_INPUT_CLASS } from '@/components/settings/field-classes';
import {
  MaskedPhoneInput,
  SearchableStateSelect,
  ZipInput,
} from '@/components/settings/contact-field-inputs';
import {
  digitsFromPhone,
  emailOptionalValid,
  formatPhoneMask,
  isZipOptionalValid,
  phoneDigitsOptionalValid,
} from '@/lib/contact-validation';
import { displayUsState, normalizeStateToCode } from '@/lib/us-states';
import {
  useUserSimulatorPrefs,
  useSaveUserSimulatorPrefs,
  useClearUserSimulatorPrefs,
} from '@/lib/hooks/use-user-simulator';
import { useUserProfile, usePatchUserProfile } from '@/lib/hooks/use-user-profile';
import { useWorkspace } from '@/lib/context/workspace-context';

type WorkspaceSettings = {
  confidenceThresholdHigh: number;
  confidenceThresholdMedium: number;
  reviewGatePolicy: unknown;
  auditRetentionYears: number;
};

type WorkspaceWithSettings = {
  id: string;
  name: string;
  slug: string;
  settings: WorkspaceSettings | null;
};

type SettingsSubTab = 'general' | 'configuration' | 'debug';

function formatPolicy(policy: unknown): string {
  if (policy == null) return '—';
  if (typeof policy === 'string') return policy;
  try {
    return JSON.stringify(policy, null, 2);
  } catch {
    return String(policy);
  }
}

const fieldInputClass = SETTINGS_FIELD_INPUT_CLASS;

const ADD_RESPONSIBLE_BROKER = '__add_responsible_broker__';

function ReadonlyValue({ value }: { value: string | undefined | null }) {
  const v = String(value ?? '').trim();
  return <p className="text-slate-900">{v ? v : '—'}</p>;
}

function ProfileCardError({ title, description, message }: { title: string; description: string; message: string }) {
  return (
    <Card title={title} description={description}>
      <p className="text-sm text-red-600">{message}</p>
    </Card>
  );
}

function BrokerInfoCard({ workspaceId }: { workspaceId: string }) {
  const { data, isLoading, isError, error } = useUserProfile(workspaceId);
  const patch = usePatchUserProfile(workspaceId);
  const [editing, setEditing] = useState(false);
  const [rbDrawerOpen, setRbDrawerOpen] = useState(false);
  const [company, setCompany] = useState('');
  const [market, setMarket] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [email, setEmail] = useState('');
  const [responsibleBrokerId, setResponsibleBrokerId] = useState('');

  const brokerContactIssues = useMemo(() => {
    const out: string[] = [];
    if (!emailOptionalValid(email)) out.push('Broker email must be a valid address or empty.');
    if (!phoneDigitsOptionalValid(phoneDigits)) out.push('Broker phone must be a complete 10-digit number or empty.');
    if (!isZipOptionalValid(zip)) out.push('ZIP must be exactly 5 digits or empty.');
    return out;
  }, [email, phoneDigits, zip]);

  useEffect(() => {
    if (!data?.broker) return;
    const b = data.broker;
    setCompany(b.company ?? '');
    setMarket(b.market ?? '');
    setLicenseNumber(b.licenseNumber ?? '');
    setAddress(b.address ?? '');
    setCity(b.city ?? '');
    setState(normalizeStateToCode(b.state ?? ''));
    setZip((b.zip ?? '').replace(/\D/g, '').slice(0, 5));
    setPhoneDigits(digitsFromPhone(b.phone ?? ''));
    setEmail(b.email ?? '');
    setResponsibleBrokerId(b.responsibleBrokerId ?? '');
  }, [data?.broker]);

  function resetDraft() {
    if (!data?.broker) return;
    const b = data.broker;
    setCompany(b.company ?? '');
    setMarket(b.market ?? '');
    setLicenseNumber(b.licenseNumber ?? '');
    setAddress(b.address ?? '');
    setCity(b.city ?? '');
    setState(normalizeStateToCode(b.state ?? ''));
    setZip((b.zip ?? '').replace(/\D/g, '').slice(0, 5));
    setPhoneDigits(digitsFromPhone(b.phone ?? ''));
    setEmail(b.email ?? '');
    setResponsibleBrokerId(b.responsibleBrokerId ?? '');
  }

  function cancelEdit() {
    resetDraft();
    setEditing(false);
  }

  if (isLoading) {
    return (
      <Card
        title="Broker information"
        description="Brokerage details, office contact, and responsible broker for this workspace."
      >
        <Spinner className="size-6 text-slate-400" />
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <ProfileCardError
        title="Broker information"
        description="Brokerage details, office contact, and responsible broker for this workspace."
        message={error instanceof Error ? error.message : 'Could not load broker information.'}
      />
    );
  }

  if (!data.broker) {
    return (
      <ProfileCardError
        title="Broker information"
        description="Brokerage details, office contact, and responsible broker for this workspace."
        message="Profile response is missing broker details. Refresh the page or restart the API."
      />
    );
  }

  const responsibleBrokers = data.responsibleBrokers ?? [];
  const rbLabel =
    responsibleBrokers.find((b) => b.id === (data.broker.responsibleBrokerId ?? ''))?.name ?? '';

  return (
    <>
      <Card
        title="Broker information"
        description="Brokerage identity, office address and contact, and optional responsible broker."
        actions={
          editing ? (
            <>
              <Button type="button" variant="secondary" size="sm" disabled={patch.isPending} onClick={cancelEdit}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={patch.isPending || brokerContactIssues.length > 0}
                onClick={() =>
                  patch.mutate(
                    {
                      company: company.trim(),
                      market: market.trim(),
                      brokerLicenseNumber: licenseNumber.trim(),
                      brokerAddress: address.trim(),
                      brokerCity: city.trim(),
                      brokerState: state.trim(),
                      brokerZip: zip.trim(),
                      brokerPhone: phoneDigits.length === 10 ? formatPhoneMask(phoneDigits) : '',
                      brokerEmail: email.trim(),
                      responsibleBrokerId: responsibleBrokerId.trim(),
                    },
                    { onSuccess: () => setEditing(false) },
                  )
                }
              >
                {patch.isPending ? 'Saving…' : 'Save'}
              </Button>
            </>
          ) : (
            <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(true)}>
              Edit
            </Button>
          )
        }
      >
        <div className="space-y-4 text-sm">
          {editing ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Brokerage / company name</label>
                  <input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Acme Realty"
                    className={fieldInputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Primary market or territory</label>
                  <input
                    value={market}
                    onChange={(e) => setMarket(e.target.value)}
                    placeholder="e.g. Austin metro"
                    className={fieldInputClass}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Broker license number</label>
                  <input
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    className={fieldInputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Broker phone</label>
                  <MaskedPhoneInput digits={phoneDigits} onDigitsChange={setPhoneDigits} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Broker email</label>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={fieldInputClass}
                  placeholder="name@example.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Street address</label>
                <input value={address} onChange={(e) => setAddress(e.target.value)} className={fieldInputClass} />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">City</label>
                  <input value={city} onChange={(e) => setCity(e.target.value)} className={fieldInputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">State</label>
                  <SearchableStateSelect value={state} onChange={setState} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">ZIP</label>
                  <ZipInput value={zip} onChange={setZip} />
                </div>
              </div>
              {brokerContactIssues.length > 0 ? (
                <ul className="list-disc space-y-1 pl-5 text-sm text-red-600">
                  {brokerContactIssues.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              ) : null}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Responsible broker</label>
                <select
                  value={responsibleBrokerId}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === ADD_RESPONSIBLE_BROKER) {
                      setRbDrawerOpen(true);
                      return;
                    }
                    setResponsibleBrokerId(v);
                  }}
                  className={fieldInputClass}
                >
                  <option value="">None</option>
                  {responsibleBrokers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                  <option value={ADD_RESPONSIBLE_BROKER}>Add responsible broker…</option>
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Pick someone already on file or add a new responsible broker (opens panel).
                </p>
              </div>
            </>
          ) : (
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-slate-500">Brokerage / company name</dt>
                <dd className="mt-1">
                  <ReadonlyValue value={data.broker.company} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Primary market or territory</dt>
                <dd className="mt-1">
                  <ReadonlyValue value={data.broker.market} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Broker license number</dt>
                <dd className="mt-1">
                  <ReadonlyValue value={data.broker.licenseNumber} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Responsible broker</dt>
                <dd className="mt-1">
                  <ReadonlyValue value={rbLabel} />
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-slate-500">Street address</dt>
                <dd className="mt-1">
                  <ReadonlyValue value={data.broker.address} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">City</dt>
                <dd className="mt-1">
                  <ReadonlyValue value={data.broker.city} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">State</dt>
                <dd className="mt-1">
                  <ReadonlyValue value={displayUsState(data.broker.state)} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">ZIP</dt>
                <dd className="mt-1">
                  <ReadonlyValue value={data.broker.zip?.replace(/\D/g, '').slice(0, 5)} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Broker phone</dt>
                <dd className="mt-1">
                  <ReadonlyValue value={data.broker.phone} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Broker email</dt>
                <dd className="mt-1">
                  <ReadonlyValue value={data.broker.email} />
                </dd>
              </div>
            </dl>
          )}
          {patch.isError && (
            <p className="text-sm text-red-600">Could not save. Check your connection and try again.</p>
          )}
        </div>
      </Card>
      <AddResponsibleBrokerDrawer
        workspaceId={workspaceId}
        open={rbDrawerOpen}
        onOpenChange={setRbDrawerOpen}
        onCreated={(id) => setResponsibleBrokerId(id)}
      />
    </>
  );
}

function PersonalAgentInfoCard({ workspaceId }: { workspaceId: string }) {
  const { data, isLoading, isError, error } = useUserProfile(workspaceId);
  const patch = usePatchUserProfile(workspaceId);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');

  const agentContactIssues = useMemo(() => {
    const out: string[] = [];
    if (!phoneDigitsOptionalValid(phoneDigits)) out.push('Phone must be a complete 10-digit number or empty.');
    if (!isZipOptionalValid(zip)) out.push('ZIP must be exactly 5 digits or empty.');
    return out;
  }, [phoneDigits, zip]);

  useEffect(() => {
    if (!data?.user || !data.agent) return;
    const a = data.agent;
    setName(data.user.name ?? '');
    setPhoneDigits(digitsFromPhone(a.phone ?? ''));
    setLicenseNumber(a.licenseNumber ?? '');
    setAddress(a.address ?? '');
    setCity(a.city ?? '');
    setState(normalizeStateToCode(a.state ?? ''));
    setZip((a.zip ?? '').replace(/\D/g, '').slice(0, 5));
  }, [data]);

  function resetDraft() {
    if (!data?.user || !data.agent) return;
    const a = data.agent;
    setName(data.user.name ?? '');
    setPhoneDigits(digitsFromPhone(a.phone ?? ''));
    setLicenseNumber(a.licenseNumber ?? '');
    setAddress(a.address ?? '');
    setCity(a.city ?? '');
    setState(normalizeStateToCode(a.state ?? ''));
    setZip((a.zip ?? '').replace(/\D/g, '').slice(0, 5));
  }

  function cancelEdit() {
    resetDraft();
    setEditing(false);
  }

  if (isLoading) {
    return (
      <Card
        title="Personal & agent information"
        description="Your name, license, mailing address, and phone (same fields as a responsible broker record)."
      >
        <Spinner className="size-6 text-slate-400" />
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <ProfileCardError
        title="Personal & agent information"
        description="Your name, license, mailing address, and phone (same fields as a responsible broker record)."
        message={error instanceof Error ? error.message : 'Could not load profile.'}
      />
    );
  }

  if (!data.user || !data.agent) {
    return (
      <ProfileCardError
        title="Personal & agent information"
        description="Your name, license, mailing address, and phone (same fields as a responsible broker record)."
        message="Profile response is missing user or agent details. Refresh the page or restart the API."
      />
    );
  }

  return (
    <Card
      title="Personal & agent information"
      description="Display name, login email (read-only), license, office or mailing address, and phone—aligned with responsible broker details."
      actions={
        editing ? (
          <>
            <Button type="button" variant="secondary" size="sm" disabled={patch.isPending} onClick={cancelEdit}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={patch.isPending || !name.trim() || agentContactIssues.length > 0}
              onClick={() =>
                patch.mutate(
                  {
                    name: name.trim(),
                    phone: phoneDigits.length === 10 ? formatPhoneMask(phoneDigits) : '',
                    licenseNumber: licenseNumber.trim(),
                    agentAddress: address.trim(),
                    agentCity: city.trim(),
                    agentState: state.trim(),
                    agentZip: zip.trim(),
                  },
                  { onSuccess: () => setEditing(false) },
                )
              }
            >
              {patch.isPending ? 'Saving…' : 'Save'}
            </Button>
          </>
        ) : (
          <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )
      }
    >
      <div className="space-y-4 text-sm">
        {editing ? (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Display name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={fieldInputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Email (login)</label>
              <input
                type="email"
                value={data.user.email}
                readOnly
                className={`${fieldInputClass} cursor-not-allowed bg-slate-50 text-slate-600`}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">License number</label>
                <input
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="Real estate license #"
                  className={fieldInputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Phone</label>
                <MaskedPhoneInput digits={phoneDigits} onDigitsChange={setPhoneDigits} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Street address</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} className={fieldInputClass} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">City</label>
                <input value={city} onChange={(e) => setCity(e.target.value)} className={fieldInputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">State</label>
                <SearchableStateSelect value={state} onChange={setState} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">ZIP</label>
                <ZipInput value={zip} onChange={setZip} />
              </div>
            </div>
            {agentContactIssues.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-sm text-red-600">
                {agentContactIssues.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            ) : null}
          </>
        ) : (
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-slate-500">Display name</dt>
              <dd className="mt-1">
                <ReadonlyValue value={data.user.name} />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Email (login)</dt>
              <dd className="mt-1">
                <ReadonlyValue value={data.user.email} />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">License number</dt>
              <dd className="mt-1">
                <ReadonlyValue value={data.agent.licenseNumber} />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Phone</dt>
              <dd className="mt-1">
                <ReadonlyValue value={data.agent.phone} />
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-slate-500">Street address</dt>
              <dd className="mt-1">
                <ReadonlyValue value={data.agent.address} />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">City</dt>
              <dd className="mt-1">
                <ReadonlyValue value={data.agent.city} />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">State</dt>
              <dd className="mt-1">
                <ReadonlyValue value={displayUsState(data.agent.state)} />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">ZIP</dt>
              <dd className="mt-1">
                <ReadonlyValue value={data.agent.zip?.replace(/\D/g, '').slice(0, 5)} />
              </dd>
            </div>
          </dl>
        )}
        {patch.isError && (
          <p className="text-sm text-red-600">Could not save. Check your connection and try again.</p>
        )}
      </div>
    </Card>
  );
}

function PhoneSimulatorSettingsCard() {
  const { data: prefs, isLoading, isError, error } = useUserSimulatorPrefs();
  const save = useSaveUserSimulatorPrefs();
  const clear = useClearUserSimulatorPrefs();
  const [editing, setEditing] = useState(false);
  const [agentFromE164, setAgentFromE164] = useState('');

  useEffect(() => {
    if (prefs?.agentFromE164) setAgentFromE164(prefs.agentFromE164);
    else if (prefs && !prefs.agentFromE164) setAgentFromE164('');
  }, [prefs?.agentFromE164]);

  function cancelEdit() {
    if (prefs) {
      setAgentFromE164(prefs.agentFromE164 ?? '');
    }
    setEditing(false);
  }

  if (isLoading) {
    return (
      <Card
        title="Phone simulator"
        description="Optional: save the E.164 number you use as “From” in the floating phone simulator."
      >
        <Spinner className="size-6 text-slate-400" />
      </Card>
    );
  }

  if (isError || !prefs) {
    return (
      <ProfileCardError
        title="Phone simulator"
        description="Optional: save the E.164 number you use as “From” in the floating phone simulator."
        message={error instanceof Error ? error.message : 'Could not load simulator preferences.'}
      />
    );
  }

  const saved = prefs.agentFromE164?.trim() ?? '';

  return (
    <Card
      title="Phone simulator"
      description="Prefill the “From” field in the floating phone simulator. Routing uses a sandbox thread; the assistant infers deals from your messages."
      actions={
        editing ? (
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={save.isPending || clear.isPending}
              onClick={cancelEdit}
            >
              Cancel
            </Button>
            {saved ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={clear.isPending || save.isPending}
                onClick={() =>
                  clear.mutate(void 0, {
                    onSuccess: () => {
                      setAgentFromE164('');
                      setEditing(false);
                    },
                  })
                }
              >
                {clear.isPending ? 'Clearing…' : 'Clear'}
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              disabled={save.isPending || !agentFromE164.trim()}
              onClick={() =>
                save.mutate(
                  { agentFromE164: agentFromE164.trim() },
                  { onSuccess: () => setEditing(false) },
                )
              }
            >
              {save.isPending ? 'Saving…' : 'Save'}
            </Button>
          </>
        ) : (
          <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )
      }
    >
      <div className="space-y-4 text-sm">
        {!editing && (
          <p className="text-slate-600">
            Use the same value as the <span className="font-medium">From Number</span> in the simulator (e.g.{' '}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">+15551234567</code>). Leave empty to type it
            each time.
          </p>
        )}

        {editing ? (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Agent “From” (E.164)</label>
            <input
              type="tel"
              autoComplete="tel"
              value={agentFromE164}
              onChange={(e) => setAgentFromE164(e.target.value)}
              placeholder="+15551234567"
              className={fieldInputClass}
            />
          </div>
        ) : (
          <dl>
            <dt className="text-xs font-medium text-slate-500">Saved “From” number</dt>
            <dd className="mt-1">
              {saved ? (
                <p className="font-mono text-slate-900">{saved}</p>
              ) : (
                <p className="text-slate-500">No number saved — sandbox mode does not require this.</p>
              )}
            </dd>
          </dl>
        )}

        {(save.isError || clear.isError) && (
          <p className="text-sm text-red-600">Something went wrong. Try again.</p>
        )}
      </div>
    </Card>
  );
}

export default function SettingsPage() {
  const { workspaceId } = useWorkspace();
  const [settingsTab, setSettingsTab] = useState<SettingsSubTab>('general');
  const { data, isLoading, isError } = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => api.get<WorkspaceWithSettings>(`/workspaces/${workspaceId}`),
    enabled: Boolean(workspaceId),
  });

  if (!workspaceId) {
    return (
      <Card title="Workspace" description="Sign in to view settings.">
        <p className="text-sm text-slate-600">
          No workspace selected. Use the{' '}
          <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
            login page
          </Link>{' '}
          to pick a demo user.
        </p>
      </Card>
    );
  }

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading workspace…</p>;
  }

  if (isError || !data) {
    return (
      <Card title="Could not load settings">
        <p className="text-sm text-slate-600">Check that the API is running and you are signed in.</p>
      </Card>
    );
  }

  const s = data.settings;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Workspace profile, automation rules, and troubleshooting.</p>
      </div>

      <div className="overflow-visible rounded-lg border border-slate-200 bg-white shadow-sm">
        <Tabs
          activeTab={settingsTab}
          onTabChange={(key) => setSettingsTab(key as SettingsSubTab)}
          tabListClassName="px-2 sm:px-3"
          panelClassName="space-y-6 px-4 pb-6 pt-2 sm:px-5"
          tabs={[
            {
              key: 'general',
              label: 'General Info',
              content: (
                <>
                  <BrokerInfoCard workspaceId={workspaceId} />
                  <PersonalAgentInfoCard workspaceId={workspaceId} />
                  <Card title="Workspace" description="Read-only in Phase 1.">
                    <dl className="grid gap-3 text-sm">
                      <div>
                        <dt className="font-medium text-slate-500">Name</dt>
                        <dd className="text-slate-900">{data.name}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-slate-500">Slug</dt>
                        <dd className="font-mono text-slate-800">{data.slug}</dd>
                      </div>
                    </dl>
                  </Card>
                </>
              ),
            },
            {
              key: 'configuration',
              label: 'Configuration',
              content: (
                <>
                  <PhoneSimulatorSettingsCard />
                  <Card title="Confidence thresholds" description="Used when evaluating extracted fields.">
                    {s ? (
                      <dl className="grid gap-3 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="font-medium text-slate-500">High</dt>
                          <dd className="text-slate-900">{s.confidenceThresholdHigh}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-slate-500">Medium</dt>
                          <dd className="text-slate-900">{s.confidenceThresholdMedium}</dd>
                        </div>
                      </dl>
                    ) : (
                      <p className="text-sm text-slate-500">No settings row yet.</p>
                    )}
                  </Card>
                  <Card title="Review gate policy" description="Actions that require review before send.">
                    <pre className="overflow-x-auto rounded-md bg-slate-50 p-3 font-mono text-xs text-slate-800">
                      {s ? formatPolicy(s.reviewGatePolicy) : '—'}
                    </pre>
                  </Card>
                  {s ? (
                    <Card title="Audit retention">
                      <p className="text-sm text-slate-700">
                        <span className="font-medium text-slate-500">Years: </span>
                        {s.auditRetentionYears}
                      </p>
                    </Card>
                  ) : null}
                </>
              ),
            },
            {
              key: 'debug',
              label: 'Debug',
              content: (
                <Card
                  title="Workspace payload"
                  description="Raw workspace object from the API (IDs, slug, and settings JSON)."
                >
                  <dl className="mb-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Workspace ID</dt>
                      <dd className="mt-1 break-all font-mono text-xs text-slate-800">{data.id}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Slug</dt>
                      <dd className="mt-1 font-mono text-xs text-slate-800">{data.slug}</dd>
                    </div>
                  </dl>
                  <pre className="max-h-[min(24rem,70vh)] overflow-auto rounded-md bg-slate-900 p-3 font-mono text-xs leading-relaxed text-slate-100">
                    {JSON.stringify(data, null, 2)}
                  </pre>
                </Card>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
