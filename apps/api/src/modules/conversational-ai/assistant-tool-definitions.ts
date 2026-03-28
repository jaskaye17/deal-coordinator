/**
 * OpenAI-style tool schemas for future function-calling. The orchestrator
 * invokes the same operations directly today (DB-only).
 */
export const ASSISTANT_TOOL_DEFINITIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'get_active_deals',
      description:
        'List deals in the workspace that are not closed or archived (active pipeline).',
      parameters: {
        type: 'object',
        properties: {},
        required: [] as string[],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_deal_status',
      description:
        'Return structured status for one deal: stage, workflow transitions, counts, and custom fields.',
      parameters: {
        type: 'object',
        properties: {
          dealId: { type: 'string', description: 'UUID of the deal' },
        },
        required: ['dealId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_missing_items',
      description: 'List open unresolved / missing-info items for a deal.',
      parameters: {
        type: 'object',
        properties: {
          dealId: { type: 'string', description: 'UUID of the deal' },
        },
        required: ['dealId'],
      },
    },
  },
];
