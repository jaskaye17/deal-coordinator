'use client';

import { Badge, Button, Card, Spinner } from '@deal-coordinator/ui';
import { useConnections, useConnectCalendar } from '@/lib/hooks';
import { useState } from 'react';
import { OpenAISettingsCard } from '@/components/openai-settings-card';

const INTEGRATIONS = [
  { key: 'auth0', label: 'Auth0 SSO', description: 'Single sign-on and user management', category: 'Authentication' },
  { key: 'twilio', label: 'Twilio', description: 'SMS and WhatsApp messaging', category: 'Messaging' },
  { key: 'bluebubbles', label: 'BlueBubbles', description: 'iMessage integration via BlueBubbles server', category: 'Messaging' },
  { key: 'google', label: 'Google Calendar', description: 'Sync events with Google Calendar', category: 'Calendar' },
  { key: 'microsoft', label: 'Microsoft 365', description: 'Sync events with Outlook Calendar', category: 'Calendar' },
  { key: 'docusign', label: 'DocuSign', description: 'Electronic signature workflows', category: 'Signatures' },
] as const;

function StatusIcon({ connected }: { connected: boolean }) {
  return connected ? (
    <svg className="size-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg className="size-5 text-slate-300" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
  );
}

export default function IntegrationsPage() {
  const { data: connections, isLoading } = useConnections();
  const connectCalendar = useConnectCalendar();
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);

  const connectedProviders = new Set(connections?.map((c) => c.provider) ?? []);

  const envConfigured = {
    auth0: Boolean(process.env.NEXT_PUBLIC_AUTH0_DOMAIN),
    twilio: false,
    bluebubbles: false,
    docusign: false,
  } as Record<string, boolean>;

  const grouped = INTEGRATIONS.reduce(
    (acc, item) => {
      let bucket = acc[item.category];
      if (!bucket) {
        bucket = [];
        acc[item.category] = bucket;
      }
      bucket.push(item);
      return acc;
    },
    {} as Record<string, typeof INTEGRATIONS[number][]>,
  );

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Integrations</h2>
        <p className="mt-1 text-sm text-slate-500">
          Connect external services to enhance your transaction workflow.
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">AI</h3>
        <OpenAISettingsCard />
      </div>

      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
            {category}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((integration) => {
              const isConnected =
                connectedProviders.has(integration.key) ||
                Boolean(envConfigured[integration.key]);
              return (
                <Card key={integration.key} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-900">
                          {integration.label}
                        </h4>
                        <StatusIcon connected={isConnected} />
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {integration.description}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Badge variant={isConnected ? 'green' : 'gray'}>
                      {isConnected ? 'Connected' : 'Not configured'}
                    </Badge>
                    {(integration.key === 'google' || integration.key === 'microsoft') && !isConnected && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setConnectingProvider(integration.key)}
                        disabled={
                          connectingProvider === integration.key || connectCalendar.isPending
                        }
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      <Card className="border-amber-200 bg-amber-50 p-4">
        <h4 className="font-semibold text-amber-800">Configuration Note</h4>
        <p className="mt-1 text-sm text-amber-700">
          Most integrations are configured via environment variables on the server.
          Calendar integrations (Google, Microsoft) can be connected per-user through
          OAuth. See the documentation for setup instructions.
        </p>
      </Card>
    </div>
  );
}
