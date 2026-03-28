import { describe, it, expect, beforeAll } from 'vitest';

// This test requires a running API and database.
// Run with: DATABASE_URL=... pnpm --filter @deal-coordinator/api test:e2e

const API_URL = process.env.API_URL || 'http://localhost:3001/api';
const WORKSPACE_ID = process.env.TEST_WORKSPACE_ID || 'test-workspace';
const USER_ID = process.env.TEST_USER_ID || 'test-user';

function headers() {
  return {
    'Content-Type': 'application/json',
    'x-workspace-id': WORKSPACE_ID,
    'x-user-id': USER_ID,
  };
}

async function apiGet(path: string) {
  const res = await fetch(`${API_URL}${path}`, { headers: headers() });
  return res.json();
}

async function apiPost(path: string, body: unknown) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  return res.json();
}

async function apiPatch(path: string, body: unknown) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(body),
  });
  return res.json();
}

describe('Deal Lifecycle E2E', () => {
  let dealId: string;

  it('should create a new listing deal', async () => {
    const result = await apiPost('/deals', {
      dealType: 'listing',
      title: 'Test Listing 456 Oak Ave',
      address: '456 Oak Ave, Chicago, IL 60601',
    });
    expect(result.data).toBeDefined();
    expect(result.data.dealType).toBe('listing');
    expect(result.data.stage).toBe('new_intake');
    dealId = result.data.id;
  });

  it('should get the deal', async () => {
    const result = await apiGet(`/deals/${dealId}`);
    expect(result.data).toBeDefined();
    expect(result.data.id).toBe(dealId);
  });

  it('should update deal fields', async () => {
    const result = await apiPatch(`/deals/${dealId}/fields`, {
      list_price: { value: '450000', source: 'manual', confidence: 'high' },
      seller_name: { value: 'John Test', source: 'manual', confidence: 'high' },
    });
    expect(result.data).toBeDefined();
  });

  it('should list audit events for the deal', async () => {
    const result = await apiGet(`/deals/${dealId}/audit-events`);
    expect(result.data).toBeDefined();
    expect(result.data.length).toBeGreaterThan(0);
  });

  it('should transition deal to awaiting_info', async () => {
    const result = await apiPost(`/deals/${dealId}/transition`, {
      targetStage: 'awaiting_info',
    });
    expect(result.data).toBeDefined();
    expect(result.data.stage).toBe('awaiting_info');
  });

  it('should create an exception', async () => {
    const result = await apiPost(`/deals/${dealId}/exceptions`, {
      title: 'Missing seller disclosure',
      description: 'Seller has not provided required disclosure forms',
      severity: 'high',
    });
    expect(result.data).toBeDefined();
    expect(result.data.status).toBe('detected');
  });

  it('should list exceptions', async () => {
    const result = await apiGet(`/deals/${dealId}/exceptions`);
    expect(result.data).toBeDefined();
    expect(result.data.length).toBe(1);
  });

  it('should create a memory entry', async () => {
    const result = await apiPost(`/deals/${dealId}/memory`, {
      content: 'Seller prefers morning showings only',
      scope: 'deal',
    });
    expect(result.data).toBeDefined();
  });

  it('should query deal status', async () => {
    const result = await apiPost(`/deals/${dealId}/query`, {
      question: 'what is missing?',
    });
    expect(result.data).toBeDefined();
    expect(result.data.answer).toBeDefined();
  });

  it('should transition through awaiting_info -> drafting_forms', async () => {
    const result = await apiPost(`/deals/${dealId}/transition`, {
      targetStage: 'drafting_forms',
    });
    expect(result.data.stage).toBe('drafting_forms');
  });
});
