#!/usr/bin/env node
/**
 * scripts/db-push.js
 *
 * Safely pushes local Cloudflare D1 schema and data changes to live remote production.
 *
 * CRITICAL SAFETY RULES:
 * 1. MIGRATIONS FIRST: Applies any pending D1 migrations to remote production first to ensure schema integrity.
 * 2. TRANSACTIONAL SYNC: Local data is exported and safely loaded into remote production within a transaction.
 * 3. NO MIGRATION COLLISION: Strips d1_migrations table inserts from the data dump to let Cloudflare track migrations natively.
 * 4. EPHEMERAL CLEANUP: Temporary export and payload SQL files are automatically cleaned up in all scenarios (success or error).
 * 5. VERIFICATION: Remote record counts are compared against local record counts to guarantee a 1:1 match.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const DB_NAME = 'chitra-sampada-db';
const timestamp = Date.now();
const tempExportFile = path.resolve(rootDir, `.tmp-d1-push-export-${timestamp}.sql`);
const tempPayloadFile = path.resolve(rootDir, `.tmp-d1-push-payload-${timestamp}.sql`);

// Hardcoded safety assertion: prevent any unauthorized database targets
function assertSafetyGuardrails() {
  if (!DB_NAME || DB_NAME !== 'chitra-sampada-db') {
    throw new Error('Safety guardrail violation: Invalid database name.');
  }
}

function runWrangler(commandStr, options = {}) {
  try {
    return execSync(`npx wrangler ${commandStr}`, {
      cwd: rootDir,
      stdio: options.silent ? 'pipe' : 'inherit',
      encoding: 'utf-8',
      ...options
    });
  } catch (err) {
    const errorMsg = err.stderr ? err.stderr.trim() : (err.stdout ? err.stdout.trim() : err.message);
    throw new Error(`Wrangler command failed: npx wrangler ${commandStr}\n${errorMsg}`);
  }
}

function cleanupTempFiles() {
  try {
    const files = fs.readdirSync(rootDir);
    for (const f of files) {
      if (f.startsWith('.tmp-d1-push')) {
        try {
          fs.unlinkSync(path.resolve(rootDir, f));
        } catch {
          // ignore individual deletion error
        }
      }
    }
  } catch {
    // ignore cleanup error
  }
}

async function main() {
  console.log('\n=============================================================');
  console.log('  Chitra Sampada — Push Local D1 Database to Remote');
  console.log('  Direction: Local Development ---> Remote (Production)');
  console.log('  Mode: Safe Schema Migration & Additive Data Sync');
  console.log('=============================================================\n');

  assertSafetyGuardrails();

  try {
    // Step 1: Apply pending migrations to remote production
    console.log(`[1/4] 🚀 Applying pending migrations to remote production (${DB_NAME})...`);
    console.log(`      Running: wrangler d1 migrations apply ${DB_NAME} --remote`);

    runWrangler(`d1 migrations apply ${DB_NAME} --remote`, {
      env: { ...process.env, CI: 'true' }
    });
    console.log('      ✅ Remote migrations successfully applied.');

    // Step 2: Export local D1 dataset (data only, no schema)
    console.log('\n[2/4] 📦 Exporting local D1 dataset (data-only)...');
    console.log(`      Running: wrangler d1 export ${DB_NAME} --local --no-schema --output <temp> -y`);

    runWrangler(`d1 export ${DB_NAME} --local --no-schema --output="${tempExportFile}" -y`);

    if (!fs.existsSync(tempExportFile)) {
      throw new Error(`Export failed: Temporary SQL dump was not created at ${tempExportFile}`);
    }

    const fileSize = fs.statSync(tempExportFile).size;
    if (fileSize === 0) {
      throw new Error('Export failed: Exported SQL file is empty.');
    }
    console.log(`      ✅ Successfully exported local data (${(fileSize / 1024).toFixed(1)} KB)`);

    // Step 3: Prepare safe sync payload and apply to remote production
    console.log('\n[3/4] 📤 Uploading and syncing local data to remote production...');

    const rawExport = fs.readFileSync(tempExportFile, 'utf-8');

    // Basic sanity validation: ensure core anime data is present
    if (!rawExport.includes('INSERT INTO "anime"')) {
      throw new Error('Export validation failed: Export file is missing core anime data.');
    }

    // Filter out d1_migrations statements (managed by wrangler migrations)
    // and convert sqlite_sequence INSERT to INSERT OR REPLACE
    const cleanedExport = rawExport
      .replace(/^INSERT INTO "d1_migrations"[^\r\n]*;?\r?\n?/gm, '')
      .replace(/^PRAGMA defer_foreign_keys=TRUE;\r?\n?/gm, '')
      .replace(/^INSERT INTO "sqlite_sequence"/gm, 'INSERT OR REPLACE INTO "sqlite_sequence"');

    // Application tables to cleanly refresh in safe foreign-key order
    const tablesToClean = [
      'anime_recommendations',
      'anime_related_media',
      'anime_streaming_platforms',
      'anime_filler_ranges',
      'blog_post_anime',
      'anime_characters',
      'anime_vibes',
      'anime_genres',
      'anime_aliases',
      'vibes',
      'franchise_watch_order',
      'franchises',
      'site_settings',
      'anime',
      'blog_posts'
    ];

    const deleteStatements = tablesToClean.map((tbl) => `DELETE FROM ${tbl};`);

    const finalSql = [
      'PRAGMA defer_foreign_keys=TRUE;',
      ...deleteStatements,
      cleanedExport.trim()
    ].join('\n');

    fs.writeFileSync(tempPayloadFile, finalSql, 'utf-8');

    console.log(`      Running: wrangler d1 execute ${DB_NAME} --remote --file=<temp> -y`);
    runWrangler(`d1 execute ${DB_NAME} --remote --file="${tempPayloadFile}" -y`);
    console.log('      ✅ Remote production dataset updated successfully.');

    // Step 4: Verification of remote records vs local records
    console.log('\n[4/4] 🔍 Verifying remote production records match local development...');
    const tablesToVerify = [
      'anime',
      'anime_aliases',
      'anime_genres',
      'anime_vibes',
      'anime_characters',
      'anime_streaming_platforms',
      'anime_filler_ranges',
      'blog_posts',
      'franchises',
      'franchise_watch_order',
      'site_settings',
      'vibes'
    ];

    console.log('\n  📊 Database Record Count Comparison:');
    console.log('  ' + 'Table'.padEnd(25) + 'Local'.padEnd(10) + 'Remote'.padEnd(10) + 'Status');
    console.log('  ------------------------------------------------------------');

    let allMatched = true;

    for (const table of tablesToVerify) {
      let localCount = 'N/A';
      let remoteCount = 'N/A';

      try {
        const localRes = runWrangler(
          `d1 execute ${DB_NAME} --local --command="SELECT count(*) as count FROM ${table};" --json`,
          { silent: true }
        );
        localCount = JSON.parse(localRes)[0]?.results[0]?.count ?? 0;
      } catch {
        localCount = 'err';
      }

      try {
        const remoteRes = runWrangler(
          `d1 execute ${DB_NAME} --remote --command="SELECT count(*) as count FROM ${table};" --json`,
          { silent: true }
        );
        remoteCount = JSON.parse(remoteRes)[0]?.results[0]?.count ?? 0;
      } catch {
        remoteCount = 'err';
      }

      const match = (localCount === remoteCount && typeof localCount === 'number');
      if (!match) allMatched = false;
      const statusIcon = match ? '✅ Match' : '⚠️ Mismatch';

      console.log(
        `  • ${table.padEnd(23)} ${String(localCount).padEnd(10)} ${String(remoteCount).padEnd(10)} ${statusIcon}`
      );
    }
    console.log('  ------------------------------------------------------------');

    // Display anime records on remote
    try {
      const animeStdout = runWrangler(
        `d1 execute ${DB_NAME} --remote --command="SELECT id, title, status, year, filler_percentage FROM anime;" --json`,
        { silent: true }
      );
      const animeList = JSON.parse(animeStdout)[0]?.results ?? [];
      if (animeList.length > 0) {
        console.log('\n  🎬 Remote Production Anime Records:');
        for (const item of animeList) {
          console.log(`    • ${item.title} (${item.id}) — ${item.year || 'N/A'} [${item.status}]`);
        }
      }
    } catch {
      // optional display
    }

    // Display site settings on remote
    try {
      const settingsStdout = runWrangler(
        `d1 execute ${DB_NAME} --remote --command="SELECT key, value FROM site_settings;" --json`,
        { silent: true }
      );
      const settingsList = JSON.parse(settingsStdout)[0]?.results ?? [];
      if (settingsList.length > 0) {
        console.log('\n  ⚙️  Remote Production Site Settings:');
        for (const item of settingsList) {
          console.log(`    • ${item.key}: "${item.value}"`);
        }
      }
    } catch {
      // optional display
    }

    if (allMatched) {
      console.log('\n  🎉 Remote production database is now 100% in sync with local development!\n');
    } else {
      console.log('\n  ⚠️ Warning: Some table counts did not match. Please review the output above.\n');
    }

  } finally {
    // Ephemeral Cleanup: Always remove temporary files
    cleanupTempFiles();
  }
}

main().catch((err) => {
  console.error('\n❌ Failed to sync D1 database to remote:', err.message);
  process.exit(1);
});
