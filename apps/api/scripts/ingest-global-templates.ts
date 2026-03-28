import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../src/prisma/prisma.module';
import { FileStorageModule } from '../src/modules/file-storage/file-storage.module';
import { TemplateIngestionService } from '../src/modules/templates/template-ingestion.service';

@Module({
  imports: [PrismaModule, FileStorageModule],
  providers: [TemplateIngestionService],
})
class IngestCliModule {}

async function main() {
  const app = await NestFactory.createApplicationContext(IngestCliModule, {
    logger: ['error', 'warn', 'log'],
  });
  const ingestion = app.get(TemplateIngestionService);
  const dryRun = process.argv.includes('--dry-run');
  const summary = await ingestion.ingestGlobalTemplates({ dryRun });
  console.log('\n--- Global template ingest summary ---');
  console.log(`Files scanned:                 ${summary.filesScanned}`);
  console.log(`Template metadata upserts:     ${summary.templatesUpserted}`);
  console.log(`Versions created:              ${summary.versionsCreated}`);
  console.log(`Versions skipped (same hash):  ${summary.versionsSkippedSameHash}`);
  console.log(`Workflow links synced:         ${summary.workflowLinksSynced}`);
  if (summary.errors.length) {
    console.log('\nErrors:');
    for (const e of summary.errors) {
      console.log(`  ${e.relativePath}: ${e.message}`);
    }
    process.exitCode = 1;
  }
  await app.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
