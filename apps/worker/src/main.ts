import { getEnvConfig } from '@deal-coordinator/config';

const config = getEnvConfig();

console.log(`[Worker] Starting in ${config.appEnv} environment`);

async function processJobs() {
  // Phase 2: Connect to job queue (Redis/BullMQ or Temporal)
  // Phase 2: Process async jobs:
  //   - workflow triggers
  //   - reminder scheduling
  //   - polling/sync tasks
  //   - exception routing
  //   - outbound sends (with review gate check)
  console.log('[Worker] Ready for job processing (no jobs configured in Phase 1)');
}

processJobs().catch((err) => {
  console.error('[Worker] Fatal error:', err);
  process.exit(1);
});
