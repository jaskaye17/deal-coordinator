import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
import {
  DEAL_FILES_ROOT_PATH,
  DEFAULT_DEAL_FOLDER_TEMPLATE,
  DEAL_SLUG_MAX_LENGTH,
  DEMO_SEED_IDS,
  generateDealName,
  type FolderTemplateNode,
  WORKSPACE_SEED_FOLDERS,
} from '@deal-coordinator/shared';

const prisma = new PrismaClient();
const DEMO_PASSWORD_HASH = bcrypt.hashSync('demo', 10);

async function reserveUniqueDealSlug(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  baseSlug: string,
): Promise<string> {
  const max = DEAL_SLUG_MAX_LENGTH;
  let candidate = baseSlug.slice(0, max).replace(/-+$/g, '') || 'deal';
  let n = 2;
  for (;;) {
    const taken = await tx.deal.findFirst({
      where: { workspaceId, slug: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
    const suffix = `-${n}`;
    const trimmedBase =
      baseSlug.slice(0, Math.max(1, max - suffix.length)).replace(/-+$/g, '') || 'deal';
    candidate = `${trimmedBase}${suffix}`.slice(0, max);
    n += 1;
  }
}

async function seedDealFolderTree(
  tx: Prisma.TransactionClient,
  storageRoot: string,
  workspaceId: string,
  dealId: string,
  umbrellaName: string,
  leaves: FolderTemplateNode[],
): Promise<void> {
  const rootKey = `${workspaceId}/deals/${dealId}/${DEAL_FILES_ROOT_PATH}`;
  fs.mkdirSync(path.join(storageRoot, rootKey), { recursive: true });
  const umbrella = await tx.folder.create({
    data: {
      workspaceId,
      dealId,
      parentId: null,
      name: umbrellaName,
      path: DEAL_FILES_ROOT_PATH,
      scope: 'deal',
    },
  });

  const walk = async (
    nodes: FolderTemplateNode[],
    parentId: string,
    parentPath: string,
  ): Promise<void> => {
    for (const node of nodes) {
      const relPath = `${parentPath}/${node.name}`;
      const relKey = `${workspaceId}/deals/${dealId}/${relPath}`;
      const diskPath = path.join(storageRoot, relKey);
      fs.mkdirSync(diskPath, { recursive: true });
      const folder = await tx.folder.create({
        data: {
          workspaceId,
          dealId,
          parentId,
          name: node.name,
          path: relPath,
          scope: 'deal',
        },
      });
      if (node.children?.length) {
        await walk(node.children, folder.id, relPath);
      }
    }
  };
  await walk(leaves, umbrella.id, DEAL_FILES_ROOT_PATH);
}

async function main() {
  await prisma.$transaction(
    async (tx) => {
      await tx.fileAsset.deleteMany();
      await tx.folder.deleteMany();
      await tx.folderTemplate.deleteMany();
      await tx.userConnection.deleteMany();
      await tx.integrationConfig.deleteMany();
      await tx.offerComparisonSnapshot.deleteMany();
      await tx.offerFile.deleteMany();
      await tx.signatureEnvelope.deleteMany();
      await tx.documentVersion.deleteMany();
      await tx.reviewTask.deleteMany();
      await tx.task.deleteMany();
      await tx.offer.deleteMany();
      await tx.document.deleteMany();
      await tx.calendarEvent.deleteMany();
      await tx.exception.deleteMany();
      await tx.communication.deleteMany();
      await tx.unresolvedItem.deleteMany();
      await tx.dealField.deleteMany();
      await tx.dealParty.deleteMany();
      await tx.dealAssignment.deleteMany();
      await tx.memoryEntry.deleteMany();
      await tx.auditEvent.deleteMany();
      await tx.deal.deleteMany();
      await tx.templateWorkflow.deleteMany();
      await tx.templateVersion.deleteMany();
      await tx.template.updateMany({ data: { parentTemplateId: null } });
      await tx.template.deleteMany();
      await tx.workflowDefinition.deleteMany();
      await tx.workspaceMembership.deleteMany();
      await tx.workspaceSettings.deleteMany();
      await tx.user.deleteMany();
      await tx.workspace.deleteMany();

      const workspace = await tx.workspace.create({
        data: {
          id: DEMO_SEED_IDS.workspaceId,
          name: 'Demo Brokerage',
          slug: 'demo-brokerage',
        },
      });

      await tx.workspaceSettings.create({
        data: {
          workspaceId: workspace.id,
        },
      });

      const workflowDefs = [
        { key: 'listing', label: 'Listing', sortOrder: 10 },
        { key: 'buyer_rep', label: 'Buyer representation', sortOrder: 20 },
        { key: 'contract_to_close', label: 'Contract to close', sortOrder: 30 },
        { key: 'offer_acceptance', label: 'Offer & acceptance', sortOrder: 40 },
        { key: 'buyer', label: 'Buyer', sortOrder: 50 },
        { key: 'general', label: 'General', sortOrder: 60 },
      ];
      for (const w of workflowDefs) {
        await tx.workflowDefinition.create({ data: w });
      }

      const admin = await tx.user.create({
        data: {
          id: DEMO_SEED_IDS.userIds.admin,
          email: 'admin@demo.com',
          name: 'Admin User',
          passwordHash: DEMO_PASSWORD_HASH,
        },
      });
      const agent = await tx.user.create({
        data: {
          id: DEMO_SEED_IDS.userIds.agent,
          email: 'agent@demo.com',
          name: 'Agent User',
          passwordHash: DEMO_PASSWORD_HASH,
        },
      });
      const reviewer = await tx.user.create({
        data: {
          id: DEMO_SEED_IDS.userIds.reviewer,
          email: 'reviewer@demo.com',
          name: 'Reviewer User',
          passwordHash: DEMO_PASSWORD_HASH,
        },
      });

      // Second workspace for multi-workspace testing
      const workspace2 = await tx.workspace.create({
        data: {
          id: '00000000-0000-4000-8000-000000000002',
          name: 'Coastal Properties Group',
          slug: 'coastal-properties',
        },
      });

      await tx.workspaceSettings.create({
        data: { workspaceId: workspace2.id },
      });

      // Multi-workspace user — member of both workspaces
      const multiUser = await tx.user.create({
        data: {
          id: '00000000-0000-4000-8000-000000000014',
          email: 'sarah@demo.com',
          name: 'Sarah Chen',
          passwordHash: DEMO_PASSWORD_HASH,
        },
      });

      await tx.workspaceMembership.createMany({
        data: [
          { workspaceId: workspace.id, userId: admin.id, role: 'admin' },
          { workspaceId: workspace.id, userId: agent.id, role: 'agent' },
          { workspaceId: workspace.id, userId: reviewer.id, role: 'reviewer' },
          { workspaceId: workspace.id, userId: multiUser.id, role: 'agent' },
          { workspaceId: workspace2.id, userId: multiUser.id, role: 'admin' },
          { workspaceId: workspace2.id, userId: admin.id, role: 'agent' },
        ],
      });

      await tx.folderTemplate.create({
        data: {
          workflowKey: 'default',
          structureJson: { roots: DEFAULT_DEAL_FOLDER_TEMPLATE },
        },
      });

      const w2Naming = generateDealName({
        primaryContactName: 'Demo Seller',
        propertyAddress: '456 Ocean Blvd, Malibu, CA 90265',
      });
      const w2Slug = await reserveUniqueDealSlug(tx, workspace2.id, w2Naming.slug);
      const dealWorkspace2 = await tx.deal.create({
        data: {
          workspaceId: workspace2.id,
          dealType: 'listing',
          stage: 'new_intake',
          title: '456 Ocean Blvd Listing',
          address: '456 Ocean Blvd, Malibu, CA 90265',
          displayName: w2Naming.displayName,
          slug: w2Slug,
          propertyAddress: '456 Ocean Blvd, Malibu, CA 90265',
          primaryContactName: 'Demo Seller',
          listPrice: new Prisma.Decimal('2750000'),
        },
      });

      const mainNaming = generateDealName({
        primaryContactName: 'Jane Seller',
        propertyAddress: '123 Main St, Springfield, IL 62701',
      });
      const mainSlug = await reserveUniqueDealSlug(tx, workspace.id, mainNaming.slug);
      const deal = await tx.deal.create({
        data: {
          workspaceId: workspace.id,
          dealType: 'listing',
          stage: 'awaiting_info',
          title: '123 Main Street Listing',
          address: '123 Main St, Springfield, IL 62701',
          displayName: mainNaming.displayName,
          slug: mainSlug,
          propertyAddress: '123 Main St, Springfield, IL 62701',
          primaryContactName: 'Jane Seller',
          listPrice: new Prisma.Decimal('325000'),
        },
      });

      await tx.dealAssignment.create({
        data: {
          dealId: deal.id,
          userId: agent.id,
          role: 'primary_agent',
        },
      });

      const addressField = await tx.dealField.create({
        data: {
          dealId: deal.id,
          workspaceId: workspace.id,
          fieldName: 'address',
          fieldValue: '123 Main St, Springfield, IL 62701',
          source: 'ai_parse',
          confidence: 0.92,
          needsConfirmation: false,
        },
      });

      const listPriceField = await tx.dealField.create({
        data: {
          dealId: deal.id,
          workspaceId: workspace.id,
          fieldName: 'list_price',
          fieldValue: '325000',
          source: 'ai_parse',
          confidence: 0.55,
          needsConfirmation: true,
        },
      });

      await tx.dealField.create({
        data: {
          dealId: deal.id,
          workspaceId: workspace.id,
          fieldName: 'seller_name',
          fieldValue: 'Jane Seller',
          source: 'manual',
        },
      });

      await tx.dealField.create({
        data: {
          dealId: deal.id,
          workspaceId: workspace.id,
          fieldName: 'year_built',
          fieldValue: '1990',
          source: 'ai_parse',
          confidence: 0.88,
          needsConfirmation: false,
        },
      });

      await tx.dealField.create({
        data: {
          dealId: deal.id,
          workspaceId: workspace.id,
          fieldName: 'hoa_flag',
          fieldValue: 'false',
          source: 'manual',
        },
      });

      const sellerParty = await tx.dealParty.create({
        data: {
          dealId: deal.id,
          workspaceId: workspace.id,
          role: 'seller',
          name: 'Jane Seller',
          email: 'jane.seller@example.com',
          phone: '555-0100',
        },
      });

      const missingBuyerAgentItem = await tx.unresolvedItem.create({
        data: {
          dealId: deal.id,
          workspaceId: workspace.id,
          type: 'missing_info',
          fieldName: 'buyer_agent_contact',
          question:
            "Who is the buyer's agent and what is the best way to reach them?",
          status: 'open',
        },
      });

      const confirmListPriceItem = await tx.unresolvedItem.create({
        data: {
          dealId: deal.id,
          workspaceId: workspace.id,
          type: 'confirm_field',
          fieldName: 'list_price',
          question:
            'Please confirm the list price extracted from the MLS sheet.',
          suggestedValue: '325000',
          status: 'open',
        },
      });

      await tx.communication.create({
        data: {
          dealId: deal.id,
          workspaceId: workspace.id,
          direction: 'inbound',
          type: 'email',
          senderName: 'Jane Seller',
          senderId: sellerParty.id,
          content:
            "Thanks for taking the listing. I've attached the disclosure forms.",
          metadata: { threadId: 'thread-001' },
        },
      });

      const inboundChat = await tx.communication.create({
        data: {
          dealId: deal.id,
          workspaceId: workspace.id,
          direction: 'inbound',
          type: 'chat',
          senderName: 'Jane Seller',
          content: 'Can we schedule photos for next Tuesday?',
        },
      });

      await tx.communication.create({
        data: {
          dealId: deal.id,
          workspaceId: workspace.id,
          direction: 'outbound',
          type: 'text',
          senderName: 'Agent User',
          senderId: agent.id,
          content:
            "Acknowledged — photo shoot tentatively Tue 10am; I'll confirm staging next.",
        },
      });

      await tx.communication.create({
        data: {
          dealId: deal.id,
          workspaceId: workspace.id,
          direction: 'inbound',
          type: 'phone',
          senderName: 'Title Company',
          content:
            'Left voicemail: preliminary title report will be emailed by EOD.',
          metadata: { durationSeconds: 45 },
        },
      });

      await tx.communication.create({
        data: {
          dealId: deal.id,
          workspaceId: workspace.id,
          direction: 'inbound',
          type: 'system',
          senderName: 'MLS Sync',
          content: 'Listing status synced: Active.',
          metadata: { mlsId: 'MLS-77821' },
        },
      });

      await tx.memoryEntry.create({
        data: {
          workspaceId: workspace.id,
          dealId: null,
          scope: 'workspace',
          content:
            'Demo Brokerage prefers neutral staging and professional photography on all listings.',
          category: 'policy',
          createdBy: admin.id,
        },
      });

      await tx.memoryEntry.createMany({
        data: [
          {
            workspaceId: workspace.id,
            dealId: deal.id,
            scope: 'deal',
            content:
              'Seller is motivated; prefers closing before end of quarter.',
            category: 'context',
            createdBy: agent.id,
          },
          {
            workspaceId: workspace.id,
            dealId: deal.id,
            scope: 'deal',
            content:
              'HOA docs requested from title; follow up if not received by Friday.',
            category: 'follow_up',
            createdBy: agent.id,
          },
        ],
      });

      await tx.auditEvent.createMany({
        data: [
          {
            workspaceId: workspace.id,
            dealId: deal.id,
            action: 'deal_created',
            objectType: 'Deal',
            objectId: deal.id,
            actorType: 'user',
            actorId: agent.id,
            after: {
              title: deal.title,
              stage: deal.stage,
              dealType: deal.dealType,
            },
            requestId: 'req-seed-deal-created',
          },
          {
            workspaceId: workspace.id,
            dealId: deal.id,
            action: 'field_updated',
            objectType: 'DealField',
            objectId: addressField.id,
            actorType: 'ai',
            actorId: 'ai-parser-v1',
            before: { fieldValue: null },
            after: { fieldValue: addressField.fieldValue, source: 'ai_parse' },
            metadata: { confidence: 0.92 },
            requestId: 'req-seed-field-address',
          },
          {
            workspaceId: workspace.id,
            dealId: deal.id,
            action: 'field_updated',
            objectType: 'DealField',
            objectId: listPriceField.id,
            actorType: 'ai',
            actorId: 'ai-parser-v1',
            before: { fieldValue: null },
            after: {
              fieldValue: listPriceField.fieldValue,
              needsConfirmation: true,
            },
            metadata: { confidence: 0.55 },
            requestId: 'req-seed-field-list-price',
          },
          {
            workspaceId: workspace.id,
            dealId: deal.id,
            action: 'unresolved_item_created',
            objectType: 'UnresolvedItem',
            objectId: missingBuyerAgentItem.id,
            actorType: 'system',
            actorId: 'rules-engine',
            after: {
              type: missingBuyerAgentItem.type,
              fieldName: missingBuyerAgentItem.fieldName,
            },
            requestId: 'req-seed-unresolved-missing',
          },
          {
            workspaceId: workspace.id,
            dealId: deal.id,
            action: 'unresolved_item_created',
            objectType: 'UnresolvedItem',
            objectId: confirmListPriceItem.id,
            actorType: 'ai',
            actorId: 'ai-parser-v1',
            after: {
              type: confirmListPriceItem.type,
              fieldName: confirmListPriceItem.fieldName,
            },
            requestId: 'req-seed-unresolved-confirm',
          },
          {
            workspaceId: workspace.id,
            dealId: deal.id,
            action: 'message_received',
            objectType: 'Communication',
            objectId: inboundChat.id,
            actorType: 'user',
            actorId: sellerParty.id,
            after: { type: 'chat', direction: 'inbound' },
            metadata: { preview: inboundChat.content.slice(0, 80) },
            requestId: 'req-seed-message-chat',
          },
        ],
      });

      await tx.exception.create({
        data: {
          dealId: deal.id,
          workspaceId: workspace.id,
          title: 'Missing HOA contact',
          description: 'No HOA management company on file for this subdivision.',
          severity: 'medium',
          status: 'detected',
          relatedObjectType: 'DealParty',
          question: 'Which HOA should we request documents from?',
        },
      });

      await tx.exception.create({
        data: {
          dealId: deal.id,
          workspaceId: workspace.id,
          title: 'Stale MLS photos',
          description: 'Listing photos are more than two years old.',
          severity: 'low',
          status: 'resolved',
          resolution: 'Seller agreed to schedule new photography.',
          resolvedAt: new Date('2025-03-20T15:00:00.000Z'),
          resolvedBy: agent.id,
        },
      });

      await tx.calendarEvent.create({
        data: {
          dealId: deal.id,
          workspaceId: workspace.id,
          title: 'Professional photography',
          description: 'Twilight and interior shots.',
          startDate: new Date('2025-04-01T10:00:00.000Z'),
          endDate: new Date('2025-04-01T13:00:00.000Z'),
          sourceType: 'calendar',
          sourceId: 'cal-seed-001',
        },
      });

      // --- Phase 2: Documents ---

      const listingAgreementDoc = await tx.document.create({
        data: {
          name: 'Listing Agreement',
          dealId: deal.id,
          workspaceId: workspace.id,
          templateId: null,
          status: 'draft',
          documentType: 'listing_agreement',
          currentVersionNumber: 1,
          requiresReview: true,
        },
      });

      const sellerDisclosureDoc = await tx.document.create({
        data: {
          name: 'Seller Disclosure',
          dealId: deal.id,
          workspaceId: workspace.id,
          templateId: null,
          status: 'draft',
          documentType: 'seller_disclosure',
          currentVersionNumber: 1,
        },
      });

      const agencyDisclosureDoc = await tx.document.create({
        data: {
          name: 'Agency Disclosure',
          dealId: deal.id,
          workspaceId: workspace.id,
          templateId: null,
          status: 'missing_info',
          documentType: 'agency_disclosure',
          currentVersionNumber: 0,
        },
      });

      // --- Phase 2: Document Versions ---

      await tx.documentVersion.create({
        data: {
          documentId: listingAgreementDoc.id,
          workspaceId: workspace.id,
          versionNumber: 1,
          changeSummary: 'Initial generation',
          createdByActorType: 'system',
        },
      });

      // --- Phase 2: Review Task ---

      await tx.reviewTask.create({
        data: {
          dealId: deal.id,
          workspaceId: workspace.id,
          actionType: 'send_listing_packet',
          objectType: 'Deal',
          objectId: deal.id,
          status: 'pending',
          assignedToUserId: reviewer.id,
          payloadJson: {
            documentIds: [
              listingAgreementDoc.id,
              sellerDisclosureDoc.id,
              agencyDisclosureDoc.id,
            ],
            recipients: [
              { name: 'Jane Seller', email: 'jane.seller@example.com' },
            ],
          },
        },
      });

      // --- Phase 2: Tasks ---

      await tx.task.create({
        data: {
          dealId: deal.id,
          workspaceId: workspace.id,
          title: 'Review property photos',
          status: 'pending',
          category: 'intake',
        },
      });

      await tx.task.create({
        data: {
          dealId: deal.id,
          workspaceId: workspace.id,
          title: 'Confirm listing price with seller',
          status: 'completed',
          category: 'intake',
          completedAt: new Date('2025-03-22T14:30:00.000Z'),
        },
      });

      // --- Phase 3: Active listing with offers ---

      const activeNaming = generateDealName({
        primaryContactName: 'Robert Thompson',
        propertyAddress: '789 Oak Ave, Springfield, IL 62702',
      });
      const activeSlug = await reserveUniqueDealSlug(tx, workspace.id, activeNaming.slug);
      const activeDeal = await tx.deal.create({
        data: {
          workspaceId: workspace.id,
          dealType: 'listing',
          stage: 'offers_received',
          title: '789 Oak Avenue Listing',
          address: '789 Oak Ave, Springfield, IL 62702',
          displayName: activeNaming.displayName,
          slug: activeSlug,
          propertyAddress: '789 Oak Ave, Springfield, IL 62702',
          primaryContactName: 'Robert Thompson',
          listPrice: new Prisma.Decimal('450000'),
        },
      });

      await tx.dealAssignment.create({
        data: {
          dealId: activeDeal.id,
          userId: agent.id,
          role: 'primary_agent',
        },
      });

      await tx.dealField.createMany({
        data: [
          { dealId: activeDeal.id, workspaceId: workspace.id, fieldName: 'property_address', fieldValue: '789 Oak Ave, Springfield, IL 62702', source: 'manual' },
          { dealId: activeDeal.id, workspaceId: workspace.id, fieldName: 'seller_name', fieldValue: 'Robert & Lisa Thompson', source: 'manual' },
          { dealId: activeDeal.id, workspaceId: workspace.id, fieldName: 'list_price', fieldValue: '450000', source: 'manual' },
          { dealId: activeDeal.id, workspaceId: workspace.id, fieldName: 'year_built', fieldValue: '2005', source: 'manual' },
          { dealId: activeDeal.id, workspaceId: workspace.id, fieldName: 'bedrooms', fieldValue: '4', source: 'manual' },
          { dealId: activeDeal.id, workspaceId: workspace.id, fieldName: 'bathrooms', fieldValue: '3', source: 'manual' },
        ],
      });

      await tx.dealParty.createMany({
        data: [
          { dealId: activeDeal.id, workspaceId: workspace.id, role: 'seller', name: 'Robert Thompson', email: 'robert.t@example.com', phone: '555-0200' },
          { dealId: activeDeal.id, workspaceId: workspace.id, role: 'seller', name: 'Lisa Thompson', email: 'lisa.t@example.com', phone: '555-0201' },
        ],
      });

      // Offer 1: Complete
      const offer1 = await tx.offer.create({
        data: {
          workspaceId: workspace.id,
          dealId: activeDeal.id,
          offerLabel: 'Johnson Family Offer',
          status: 'summarized',
          buyerName: 'Michael & Sarah Johnson',
          buyerAgent: 'David Wilson, RE/MAX',
          offerPrice: new Prisma.Decimal('440000'),
          earnestMoney: new Prisma.Decimal('8000'),
          optionPeriodDays: 10,
          financingType: 'conventional',
          closeDate: new Date('2026-05-15'),
          proofOfFundsStatus: 'not_provided',
          preapprovalStatus: 'provided',
          summaryJson: {
            fields: {
              buyerName: 'Michael & Sarah Johnson',
              offerPrice: 440000,
              earnestMoney: 8000,
              financingType: 'conventional',
              optionPeriodDays: 10,
              closeDate: '2026-05-15',
              preapprovalPresent: true,
              proofOfFundsPresent: false,
            },
            completeness: 0.88,
            source: {
              buyerName: 'user_provided',
              offerPrice: 'user_provided',
              earnestMoney: 'user_provided',
              financingType: 'user_provided',
              optionPeriodDays: 'user_provided',
              closeDate: 'user_provided',
              preapprovalPresent: 'filename_heuristic',
              proofOfFundsPresent: 'filename_heuristic',
            },
            extractedAt: new Date().toISOString(),
          },
          extractedFieldsJson: {
            buyerName: 'Michael & Sarah Johnson',
            offerPrice: 440000,
            earnestMoney: 8000,
            financingType: 'conventional',
            optionPeriodDays: 10,
            closeDate: '2026-05-15',
          },
          extractionConfidenceJson: {
            buyerName: 1.0,
            offerPrice: 1.0,
            earnestMoney: 1.0,
            financingType: 1.0,
            optionPeriodDays: 1.0,
            closeDate: 1.0,
            preapprovalPresent: 0.5,
            proofOfFundsPresent: 0.5,
          },
          receivedAt: new Date('2026-03-20T14:30:00Z'),
        },
      });

      await tx.offerFile.createMany({
        data: [
          {
            offerId: offer1.id,
            workspaceId: workspace.id,
            fileName: 'johnson_purchase_agreement__v1.pdf',
            fileType: 'pdf',
          },
          {
            offerId: offer1.id,
            workspaceId: workspace.id,
            fileName: 'johnson_pre_approval_letter__v1.pdf',
            fileType: 'pdf',
          },
        ],
      });

      // Offer 2: Incomplete (cash, no close date)
      const offer2 = await tx.offer.create({
        data: {
          workspaceId: workspace.id,
          dealId: activeDeal.id,
          offerLabel: 'Westfield Capital Offer',
          status: 'incomplete',
          buyerName: null,
          buyerEntityName: 'Westfield Capital LLC',
          buyerAgent: 'Amy Rodriguez, Keller Williams',
          offerPrice: new Prisma.Decimal('465000'),
          earnestMoney: new Prisma.Decimal('15000'),
          optionPeriodDays: 7,
          financingType: 'cash',
          closeDate: null,
          proofOfFundsStatus: 'provided',
          preapprovalStatus: null,
          summaryJson: {
            fields: {
              buyerEntityName: 'Westfield Capital LLC',
              offerPrice: 465000,
              earnestMoney: 15000,
              financingType: 'cash',
              optionPeriodDays: 7,
              proofOfFundsPresent: true,
            },
            completeness: 0.63,
            source: {
              buyerEntityName: 'user_provided',
              offerPrice: 'user_provided',
              earnestMoney: 'user_provided',
              financingType: 'user_provided',
              optionPeriodDays: 'user_provided',
              proofOfFundsPresent: 'filename_heuristic',
            },
            extractedAt: new Date().toISOString(),
          },
          extractedFieldsJson: {
            buyerEntityName: 'Westfield Capital LLC',
            offerPrice: 465000,
            earnestMoney: 15000,
            financingType: 'cash',
            optionPeriodDays: 7,
          },
          extractionConfidenceJson: {
            buyerEntityName: 1.0,
            offerPrice: 1.0,
            earnestMoney: 1.0,
            financingType: 1.0,
            optionPeriodDays: 1.0,
            proofOfFundsPresent: 0.5,
          },
          receivedAt: new Date('2026-03-22T09:15:00Z'),
        },
      });

      await tx.offerFile.createMany({
        data: [
          {
            offerId: offer2.id,
            workspaceId: workspace.id,
            fileName: 'westfield_loi__v1.pdf',
            fileType: 'pdf',
          },
          {
            offerId: offer2.id,
            workspaceId: workspace.id,
            fileName: 'westfield_proof_of_funds__v1.pdf',
            fileType: 'pdf',
          },
        ],
      });

      // Audit events for offers
      await tx.auditEvent.createMany({
        data: [
          {
            workspaceId: workspace.id,
            dealId: activeDeal.id,
            action: 'offer_received',
            objectType: 'Offer',
            objectId: offer1.id,
            actorType: 'user',
            actorId: agent.id,
            requestId: 'req-seed-offer-1',
          },
          {
            workspaceId: workspace.id,
            dealId: activeDeal.id,
            action: 'offer_summarized',
            objectType: 'Offer',
            objectId: offer1.id,
            actorType: 'system',
            actorId: agent.id,
            requestId: 'req-seed-offer-1-summary',
          },
          {
            workspaceId: workspace.id,
            dealId: activeDeal.id,
            action: 'offer_received',
            objectType: 'Offer',
            objectId: offer2.id,
            actorType: 'user',
            actorId: agent.id,
            requestId: 'req-seed-offer-2',
          },
          {
            workspaceId: workspace.id,
            dealId: activeDeal.id,
            action: 'stage_transitioned',
            objectType: 'Deal',
            objectId: activeDeal.id,
            actorType: 'system',
            actorId: agent.id,
            before: { stage: 'active' },
            after: { stage: 'offers_received' },
            requestId: 'req-seed-offers-stage',
          },
        ],
      });

      // --- Phase 3: Calendar events for the active deal ---

      await tx.calendarEvent.createMany({
        data: [
          {
            dealId: activeDeal.id,
            workspaceId: workspace.id,
            eventType: 'custom',
            title: 'Open House',
            startDate: new Date('2026-03-29T14:00:00Z'),
            endDate: new Date('2026-03-29T17:00:00Z'),
            status: 'active',
            sourceType: 'manual',
          },
          {
            dealId: activeDeal.id,
            workspaceId: workspace.id,
            eventType: 'closing_date',
            title: 'Tentative Closing',
            startDate: new Date('2026-05-15T10:00:00Z'),
            status: 'active',
            sourceType: 'deal_field',
          },
        ],
      });
      // --- Phase 4.5: Folders and FileAssets with real files ---

      const storagePath = path.resolve(__dirname, '../../../tmp/storage');

      // Helper to create a file on disk and a matching FileAsset record
      async function seedFile(
        wsId: string,
        dlId: string | null,
        folderId: string | null,
        folderPathStr: string,
        fileName: string,
        content: string,
        mimeType: string,
        scope: string,
      ) {
        const keyBase = dlId ? `${wsId}/deals/${dlId}` : `${wsId}/_files`;
        const fileKey = folderPathStr
          ? `${keyBase}/${folderPathStr}/${fileName}`
          : `${keyBase}/${fileName}`;

        const diskPath = path.join(storagePath, fileKey);
        fs.mkdirSync(path.dirname(diskPath), { recursive: true });
        fs.writeFileSync(diskPath, content);

        return tx.fileAsset.create({
          data: {
            workspaceId: wsId,
            dealId: dlId,
            folderId,
            fileName,
            fileKey,
            mimeType,
            fileSize: Buffer.byteLength(content),
            scope,
            uploadedBy: agent.id,
          },
        });
      }

      const WSF = WORKSPACE_SEED_FOLDERS;

      const sharedDocsFolder = await tx.folder.create({
        data: {
          workspaceId: workspace.id,
          name: WSF.sharedDocuments.name,
          path: WSF.sharedDocuments.path,
          scope: 'workspace',
        },
      });

      const complianceFolder = await tx.folder.create({
        data: {
          workspaceId: workspace.id,
          parentId: sharedDocsFolder.id,
          name: WSF.compliance.name,
          path: WSF.compliance.path,
          scope: 'workspace',
        },
      });

      await seedDealFolderTree(
        tx,
        storagePath,
        workspace.id,
        deal.id,
        deal.displayName ?? deal.title ?? 'Deal',
        DEFAULT_DEAL_FOLDER_TEMPLATE,
      );
      await seedDealFolderTree(
        tx,
        storagePath,
        workspace2.id,
        dealWorkspace2.id,
        dealWorkspace2.displayName ?? dealWorkspace2.title ?? 'Deal',
        DEFAULT_DEAL_FOLDER_TEMPLATE,
      );
      await seedDealFolderTree(
        tx,
        storagePath,
        workspace.id,
        activeDeal.id,
        activeDeal.displayName ?? activeDeal.title ?? 'Deal',
        DEFAULT_DEAL_FOLDER_TEMPLATE,
      );

      const dealListing = await tx.folder.findFirstOrThrow({
        where: { dealId: deal.id, path: `${DEAL_FILES_ROOT_PATH}/listing` },
      });
      const dealDisclosures = await tx.folder.findFirstOrThrow({
        where: { dealId: deal.id, path: `${DEAL_FILES_ROOT_PATH}/disclosures` },
      });
      const activeListing = await tx.folder.findFirstOrThrow({
        where: { dealId: activeDeal.id, path: `${DEAL_FILES_ROOT_PATH}/listing` },
      });
      const activeContracts = await tx.folder.findFirstOrThrow({
        where: { dealId: activeDeal.id, path: `${DEAL_FILES_ROOT_PATH}/contracts` },
      });

      // Workspace files (basenames: snake_case + __v{n} per apps/api/templates/global ingestion docs)
      await seedFile(
        workspace.id,
        null,
        complianceFolder.id,
        WSF.compliance.path,
        'fair_housing_policy__v1.pdf',
        '%PDF-1.4\nFair Housing Policy\nDemo Brokerage is committed to fair housing practices.',
        'application/pdf',
        'workspace',
      );

      await seedFile(
        workspace.id,
        null,
        sharedDocsFolder.id,
        WSF.sharedDocuments.path,
        'agent_onboarding_checklist__v1.docx',
        'Agent Onboarding Checklist\n1. License verification\n2. E&O insurance\n3. MLS access setup\n4. Office key assignment',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'workspace',
      );

      // Deal files for 123 Main St
      await seedFile(
        workspace.id,
        deal.id,
        dealListing.id,
        `${DEAL_FILES_ROOT_PATH}/listing`,
        'mls_listing_sheet__v1.pdf',
        `%PDF-1.4\nMLS Listing Sheet\nProperty: 123 Main St, Springfield, IL 62701\nList Price: $325,000\nBedrooms: 3 | Bathrooms: 2\nYear Built: 1990\nLot Size: 0.25 acres\nMLS#: MLS-77821`,
        'application/pdf',
        'deal',
      );

      await seedFile(
        workspace.id,
        deal.id,
        dealListing.id,
        `${DEAL_FILES_ROOT_PATH}/listing`,
        'property_photos_inventory__v1.csv',
        'photo_id,room,description,date_taken\n1,exterior_front,Front of house,2025-03-15\n2,kitchen,Kitchen overview,2025-03-15\n3,master_bedroom,Master suite,2025-03-15\n4,backyard,Backyard and patio,2025-03-15',
        'text/csv',
        'deal',
      );

      await seedFile(
        workspace.id,
        deal.id,
        dealListing.id,
        `${DEAL_FILES_ROOT_PATH}/listing`,
        'listing_agreement_signed__v1.pdf',
        `%PDF-1.4\nExclusive Right to Sell Listing Agreement\nSeller: Jane Seller\nProperty: 123 Main St, Springfield, IL 62701\nList Price: $325,000\nCommission: 6%\nExpiration: 2025-09-15\nSigned: 2025-03-10`,
        'application/pdf',
        'deal',
      );

      await seedFile(
        workspace.id,
        deal.id,
        dealDisclosures.id,
        `${DEAL_FILES_ROOT_PATH}/disclosures`,
        'seller_disclosure_completed__v1.pdf',
        `%PDF-1.4\nSeller Property Disclosure\nSeller: Jane Seller\nProperty: 123 Main St\nKnown defects: Minor roof patch in 2020\nFlood zone: No\nLead paint: No (built 1990)\nHOA: None`,
        'application/pdf',
        'deal',
      );

      await seedFile(
        workspace.id,
        deal.id,
        dealDisclosures.id,
        `${DEAL_FILES_ROOT_PATH}/disclosures`,
        'lead_paint_disclosure__v1.pdf',
        '%PDF-1.4\nLead-Based Paint Disclosure\nProperty built 1990 - post-1978, no lead paint disclosure required.\nSigned by seller: Jane Seller',
        'application/pdf',
        'deal',
      );

      // Deal files for 789 Oak Ave (active deal with offers)
      await seedFile(
        workspace.id,
        activeDeal.id,
        activeListing.id,
        `${DEAL_FILES_ROOT_PATH}/listing`,
        'oak_ave_mls_sheet__v1.pdf',
        `%PDF-1.4\nMLS Listing Sheet\nProperty: 789 Oak Ave, Springfield, IL 62702\nList Price: $450,000\nBedrooms: 4 | Bathrooms: 3\nYear Built: 2005\nSquare Feet: 2,800\nGarage: 2-car attached`,
        'application/pdf',
        'deal',
      );

      await seedFile(
        workspace.id,
        activeDeal.id,
        activeContracts.id,
        `${DEAL_FILES_ROOT_PATH}/contracts`,
        'johnson_purchase_agreement__v1.pdf',
        `%PDF-1.4\nPurchase Agreement\nBuyer: Michael & Sarah Johnson\nProperty: 789 Oak Ave, Springfield, IL 62702\nOffer Price: $440,000\nEarnest Money: $8,000\nFinancing: Conventional\nOption Period: 10 days\nClosing Date: 2026-05-15`,
        'application/pdf',
        'deal',
      );

      await seedFile(
        workspace.id,
        activeDeal.id,
        activeContracts.id,
        `${DEAL_FILES_ROOT_PATH}/contracts`,
        'johnson_pre_approval_letter__v1.pdf',
        '%PDF-1.4\nPre-Approval Letter\nBorrower: Michael & Sarah Johnson\nApproved Amount: $460,000\nLender: First National Bank\nLoan Type: Conventional 30-year fixed\nDate: 2026-03-10',
        'application/pdf',
        'deal',
      );

      await seedFile(
        workspace.id,
        activeDeal.id,
        activeContracts.id,
        `${DEAL_FILES_ROOT_PATH}/contracts`,
        'westfield_loi__v1.pdf',
        `%PDF-1.4\nLetter of Intent\nBuyer: Westfield Capital LLC\nProperty: 789 Oak Ave, Springfield, IL 62702\nOffer Price: $465,000\nEarnest Money: $15,000\nFinancing: Cash\nOption Period: 7 days\nNote: Closing date TBD`,
        'application/pdf',
        'deal',
      );

      await seedFile(
        workspace.id,
        activeDeal.id,
        activeContracts.id,
        `${DEAL_FILES_ROOT_PATH}/contracts`,
        'westfield_proof_of_funds__v1.pdf',
        '%PDF-1.4\nProof of Funds Statement\nEntity: Westfield Capital LLC\nAccount Balance: $1,250,000\nBank: Chase Commercial\nDate: 2026-03-18',
        'application/pdf',
        'deal',
      );

      console.log('  Seeded folders and files with real on-disk storage');
    },
    { maxWait: 60000, timeout: 120000 },
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
