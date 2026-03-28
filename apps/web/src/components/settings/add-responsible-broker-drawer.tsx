'use client';

import { Button, Drawer } from '@deal-coordinator/ui';
import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { useCreateResponsibleBroker } from '@/lib/hooks/use-user-profile';
import { SETTINGS_FIELD_INPUT_CLASS } from './field-classes';
import { MaskedPhoneInput, SearchableStateSelect, ZipInput } from './contact-field-inputs';
import {
  digitsFromPhone,
  emailOptionalValid,
  formatPhoneMask,
  isZipOptionalValid,
  phoneDigitsOptionalValid,
} from '@/lib/contact-validation';

export function AddResponsibleBrokerDrawer({
  workspaceId,
  open,
  onOpenChange,
  onCreated,
}: {
  workspaceId: string;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onCreated: (id: string) => void;
}) {
  const createRb = useCreateResponsibleBroker(workspaceId);
  const [name, setName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [email, setEmail] = useState('');

  const fc = SETTINGS_FIELD_INPUT_CLASS;

  const fieldIssues = useMemo(() => {
    const out: string[] = [];
    if (!emailOptionalValid(email)) out.push('Email must be a valid address or empty.');
    if (!phoneDigitsOptionalValid(phoneDigits)) out.push('Phone must be a complete 10-digit number or empty.');
    if (!isZipOptionalValid(zip)) out.push('ZIP must be exactly 5 digits or empty.');
    return out;
  }, [email, phoneDigits, zip]);

  useEffect(() => {
    if (!open) return;
    setName('');
    setLicenseNumber('');
    setAddress('');
    setCity('');
    setState('');
    setZip('');
    setPhoneDigits('');
    setEmail('');
  }, [open]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || fieldIssues.length > 0) return;
    try {
      const row = await createRb.mutateAsync({
        name: name.trim(),
        licenseNumber: licenseNumber.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        zip: zip.trim() || undefined,
        phone: phoneDigits.length === 10 ? formatPhoneMask(phoneDigits) : undefined,
        email: email.trim() || undefined,
      });
      onCreated(row.id);
      onOpenChange(false);
    } catch {
      /* mutation surfaces isError */
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="Add responsible broker">
      <form className="space-y-4 text-sm" onSubmit={submit}>
        <p className="text-slate-600">
          Add a designated responsible broker for this workspace. You can link them from broker information after
          saving.
        </p>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fc}
            placeholder="Full name"
            autoFocus
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">License number</label>
          <input
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
            className={fc}
            placeholder="License #"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Street address</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={fc}
            placeholder="Street"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">City</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} className={fc} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">State</label>
            <SearchableStateSelect value={state} onChange={setState} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">ZIP</label>
          <ZipInput value={zip} onChange={setZip} className={fc} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Phone</label>
          <MaskedPhoneInput digits={phoneDigits} onDigitsChange={setPhoneDigits} className={fc} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Email</label>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fc}
            placeholder="name@example.com"
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={createRb.isPending || !name.trim() || fieldIssues.length > 0}
          >
            {createRb.isPending ? 'Saving…' : 'Save broker'}
          </Button>
        </div>
        {fieldIssues.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-sm text-red-600">
            {fieldIssues.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        ) : null}
        {createRb.isError && (
          <p className="text-sm text-red-600">Could not save. Check your connection and try again.</p>
        )}
      </form>
    </Drawer>
  );
}
