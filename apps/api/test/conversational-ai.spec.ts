import { describe, it, expect } from 'vitest';
import { ConversationalIntentService } from '../src/modules/conversational-ai/conversational-intent.service';
import { GuidanceEngineService } from '../src/modules/conversational-ai/guidance-engine.service';
import { ChatOrchestratorService } from '../src/modules/conversational-ai/chat-orchestrator.service';

describe('ConversationalIntentService', () => {
  const svc = new ConversationalIntentService();

  it('detects query_active_deals for "what deals are active"', () => {
    const r = svc.detect('What deals are active right now?', {});
    expect(r.intent).toBe('query_active_deals');
    expect(r.confidence).toBeGreaterThan(0.8);
  });

  it('detects create_deal_listing for "start listing 1403…"', () => {
    const r = svc.detect('Start listing 1403 Oak Street', {});
    expect(r.intent).toBe('create_deal_listing');
    expect(r.entities.addressSnippet).toMatch(/1403\s+Oak/i);
  });

  it('detects query_deal_status + next_steps for "what\'s next"', () => {
    const r = svc.detect("What's next on this deal?", { dealId: 'deal-1' });
    expect(r.intent).toBe('query_deal_status');
    expect(r.entities.statusAspect).toBe('next_steps');
    expect(r.confidence).toBeGreaterThan(0.8);
  });

  it('detects workspace_brokerage_info before other "what" patterns', () => {
    const r = svc.detect('What is my brokerage name?', {});
    expect(r.intent).toBe('workspace_brokerage_info');
  });
});

describe('GuidanceEngineService', () => {
  const guidance = new GuidanceEngineService();

  it('summarizes active deals count', () => {
    const g = guidance.build({
      intent: {
        intent: 'query_active_deals',
        confidence: 0.9,
        entities: {},
      },
      queryPayload: {
        deals: [{ id: '1', stage: 'new_intake' }],
        total: 1,
      },
    });
    expect(g.suggestion).toMatch(/1 active deal/);
  });

  it('lists workflow next steps', () => {
    const g = guidance.build({
      intent: {
        intent: 'query_deal_status',
        confidence: 0.9,
        entities: { statusAspect: 'next_steps' },
      },
      queryPayload: {
        deal: { stage: 'new_intake', displayName: 'Test' },
        transitions: [{ to: 'awaiting_info', label: 'Request information' }],
      },
    });
    expect(g.nextSteps).toContain('Request information');
    expect(g.suggestion).toMatch(/new_intake/);
  });

  it('uses brokerageAnswer for workspace_brokerage_info', () => {
    const g = guidance.build({
      intent: {
        intent: 'workspace_brokerage_info',
        confidence: 0.96,
        entities: {},
      },
      queryPayload: { brokerageAnswer: 'Your brokerage here is Acme — that\'s your workspace name.' },
    });
    expect(g.suggestion).toContain('Acme');
  });
});

describe('ChatOrchestratorService.formatDeterministic', () => {
  it('renders grounded lines from backend facts', () => {
    const orch = Object.create(ChatOrchestratorService.prototype) as ChatOrchestratorService;
    const text = orch.formatDeterministic({
      intent: 'query_active_deals',
      confidence: 0.9,
      entities: {},
      payload: {
        deals: [
          { displayName: 'Smith / 1403 Oak', title: null, stage: 'drafting_forms' },
        ],
      },
      guidance: {
        suggestion: 'There is 1 active deal.',
        missingItems: [],
        nextSteps: [],
      },
    });
    expect(text).toContain('query_active_deals');
    expect(text).toContain('1403 Oak');
  });
});
