'use client';

import {
  Button,
  Input,
  Select,
  Textarea,
} from '@deal-coordinator/ui';
import { DEAL_TYPES } from '@deal-coordinator/shared';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useCreateDeal } from '@/lib/hooks';

const dealTypeOptions = DEAL_TYPES.map((value) => ({
  value,
  label:
    value === 'buyer_rep'
      ? 'Buyer Rep'
      : value === 'contract_to_close'
        ? 'Contract to Close'
        : 'Listing',
}));

export interface NewDealFormProps {
  onCancel: () => void;
}

export function NewDealForm({ onCancel }: NewDealFormProps) {
  const router = useRouter();
  const create = useCreateDeal();
  const [primaryContactName, setPrimaryContactName] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [dealType, setDealType] = useState<string>(DEAL_TYPES[0] ?? 'listing');
  const [description, setDescription] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const deal = await create.mutateAsync({
      dealType,
      primaryContactName: primaryContactName.trim(),
      propertyAddress: propertyAddress.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
    });
    router.push(`/deals/${deal.id}`);
    onCancel();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Primary contact"
        value={primaryContactName}
        onChange={(e) => setPrimaryContactName(e.currentTarget.value)}
        placeholder="e.g. John Smith"
        autoComplete="name"
        required
      />
      <Select
        label="Deal type"
        options={dealTypeOptions}
        value={dealType}
        onChange={(e) => setDealType(e.currentTarget.value)}
      />
      <Input
        label="Property address"
        value={propertyAddress}
        onChange={(e) => setPropertyAddress(e.currentTarget.value)}
        placeholder="e.g. 1403 Green Forest Dr, Austin, TX"
        autoComplete="street-address"
        required
      />
      <Textarea
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.currentTarget.value)}
        placeholder="Notes or context for the team"
        rows={4}
      />
      {create.isError ? (
        <p className="text-sm text-red-600" role="alert">
          {create.error instanceof Error
            ? create.error.message
            : 'Could not create deal.'}
        </p>
      ) : null}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={create.isPending}>
          Create deal
        </Button>
      </div>
    </form>
  );
}
