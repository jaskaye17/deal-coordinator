import { Injectable } from '@nestjs/common';
import type { ConversationQueryService } from './conversation-query.service';

/**
 * Named tools the orchestrator (and future tool-calling LLMs) can invoke.
 * All methods are DB-backed only.
 */
@Injectable()
export class AssistantToolsService {
  constructor(private readonly queries: ConversationQueryService) {}

  get_active_deals(workspaceId: string) {
    return this.queries.getActiveDeals(workspaceId);
  }

  get_deal_status(workspaceId: string, dealId: string) {
    return this.queries.getDealStatus(workspaceId, dealId);
  }

  get_missing_items(workspaceId: string, dealId: string) {
    return this.queries.getMissingItems(workspaceId, dealId);
  }
}
