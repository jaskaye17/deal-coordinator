'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, Button, Select, Spinner } from '@deal-coordinator/ui';
import {
  useUserOpenAIStatus,
  useSaveUserOpenAI,
  useClearUserOpenAI,
  OPENAI_MODEL_OPTIONS,
} from '@/lib/hooks';

export function OpenAISettingsCard() {
  const { data: status, isLoading } = useUserOpenAIStatus();
  const save = useSaveUserOpenAI();
  const clear = useClearUserOpenAI();
  const [apiKey, setApiKey] = useState('');
  const modelOptions = useMemo(
    () => OPENAI_MODEL_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    [],
  );
  const [model, setModel] = useState<string>(OPENAI_MODEL_OPTIONS[0].value);

  useEffect(() => {
    if (status?.model) setModel(status.model);
  }, [status?.model]);

  if (isLoading || !status) {
    return (
      <Card title="OpenAI" description="Personal API key for LLM features (phone simulator, etc.).">
        <Spinner className="size-6 text-slate-400" />
      </Card>
    );
  }

  return (
    <Card
      title="OpenAI"
      description="Your key is stored on your user account and used when you run LLM ON in the phone simulator and other features tied to your login. It is not shared with other workspace members."
    >
      <div className="space-y-4 text-sm">
        <p className="text-slate-600">
          Create a secret key in the{' '}
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            OpenAI dashboard
          </a>
          . Paste it below—this is the same type of key as for other apps (starts with{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">sk-</code>).
        </p>

        {status.configured ? (
          <p className="rounded-md bg-green-50 px-3 py-2 text-green-800 ring-1 ring-green-200">
            OpenAI is connected for your account
            {status.model ? (
              <>
                {' '}
                (model: <span className="font-mono">{status.model}</span>)
              </>
            ) : null}
            .
          </p>
        ) : (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-900 ring-1 ring-amber-200">
            No personal key saved yet. LLM ON in the phone simulator will prompt you to add one here (unless the
            server has <code className="text-xs">OPENAI_API_KEY</code> set as a fallback).
          </p>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">API secret key</label>
          <input
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={status.configured ? '•••••••• (enter new key to replace)' : 'sk-...'}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <Select
          label="Model"
          options={modelOptions}
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="mt-0"
          selectClassName="border-slate-300 py-2 text-sm"
        />

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={save.isPending || !apiKey.trim()}
            onClick={() => {
              save.mutate(
                { apiKey: apiKey.trim(), model },
                {
                  onSuccess: () => {
                    setApiKey('');
                  },
                },
              );
            }}
          >
            {save.isPending ? 'Saving…' : 'Save key'}
          </Button>
          {status.configured ? (
            <Button
              type="button"
              variant="secondary"
              disabled={clear.isPending}
              onClick={() => clear.mutate()}
            >
              {clear.isPending ? 'Removing…' : 'Remove my key'}
            </Button>
          ) : null}
        </div>

        {(save.isError || clear.isError) && (
          <p className="text-sm text-red-600">Something went wrong. Check the API and try again.</p>
        )}
      </div>
    </Card>
  );
}
