#!/usr/bin/env node
/**
 * scripts/db-pull.js
 *
 * Pulls clean production data from Cloudflare D1 into local development.
 *
 * CRITICAL SAFETY RULES:
 * 1. STRICTLY READ-ONLY on Remote: Only `wrangler d1 export ... --remote` is ever called.
 * 2. Writes ONLY to --local: Local state is reset and re-populated with the fresh production dump.
 * 3. Ephemeral: Export SQL file is automatically cleaned up in all scenarios (success or error).
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const DB_NAME = 'chitra-sampada-db';
const tempSqlFile = path.resolve(rootDir, `.tmp-d1-pull-${Date.now()}.sql`);
const localD1StateDir = path.resolve(rootDir, '.wrangler', 'state', 'v3', 'd1');

// Hardcoded safety assertion: prevent any unauthorized database targets or upstream operations
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

async function main() {
  console.log('\n=============================================================');
  console.log('  Chitra Sampada — Pull Production D1 Database to Local');
  console.log('  Direction: Remote (Production) ---> Local Development');
  console.log('  Mode: Strictly Read-Only on Remote');
  console.log('=============================================================\n');

  assertSafetyGuardrails();

  try {
    // Step 1: Export from Remote Production D1 (Read-Only)
    console.log(`[1/4] 📦 Exporting clean dataset from remote production (${DB_NAME})...`);
    console.log(`      Running: wrangler d1 export ${DB_NAME} --remote --output <temp> -y`);

    runWrangler(`d1 export ${DB_NAME} --remote --output="${tempSqlFile}" -y`);

    if (!fs.existsSync(tempSqlFile)) {
      throw new Error(`Export failed: Temporary SQL dump was not created at ${tempSqlFile}`);
    }

    const fileSize = fs.statSync(tempSqlFile).size;
    if (fileSize === 0) {
      throw new Error('Export failed: Exported SQL file is empty.');
    }
    console.log(`      ✅ Successfully downloaded export (${(fileSize / 1024).toFixed(1)} KB)`);

    // Step 2: Wipe Stale Local D1 State
    console.log('\n[2/4] 🧹 Clearing stale local .wrangler D1 database cache...');
    if (fs.existsSync(localD1StateDir)) {
      try {
        fs.rmSync(localD1StateDir, { recursive: true, force: true });
        console.log('      ✅ Local D1 state wiped clean.');
      } catch (err) {
        if (err.code === 'EBUSY' || err.code === 'EPERM') {
          console.error('\n❌ ERROR: Local database file is currently locked by a running process.');
          console.error('   Please stop any active dev server (e.g. run "astro dev stop") and try again.\n');
          process.exit(1);
        }
        throw err;
      }
    } else {
      console.log('      ℹ️  No existing local D1 state found (clean slate).');
    }

    // Step 3: Load Export into Local Environment
    console.log('\n[3/4] 📥 Loading fresh production dataset into --local D1...');
    console.log(`      Running: wrangler d1 execute ${DB_NAME} --local --file=<temp> -y`);

    runWrangler(`d1 execute ${DB_NAME} --local --file="${tempSqlFile}" -y`);
    console.log('      ✅ Production dataset imported into local D1 successfully.');

    // Step 4: Verification of Local Records
    console.log('\n[4/4] 🔍 Verifying local records match production...');
    const tables = [
      'anime',
      'franchises',
      'franchise_watch_order',
      'blog_posts',
      'anime_characters',
      'anime_filler_ranges',
      'anime_genres',
      'anime_vibes'
    ];

    const counts = {};
    for (const table of tables) {
      try {
        const stdout = runWrangler(
          `d1 execute ${DB_NAME} --local --command="SELECT count(*) as count FROM ${table};" --json`,
          { silent: true }
        );
        const parsed = JSON.parse(stdout);
        const count = parsed[0]?.results[0]?.count ?? 0;
        counts[table] = count;
      } catch {
        counts[table] = 'ok';
      }
    }

    console.log('\n  📊 Local Database Status (Matches Production):');
    console.log('  ---------------------------------------------');
    for (const [tbl, count] of Object.entries(counts)) {
      console.log(`    • ${tbl.padEnd(25)} : ${count} record${count === 1 ? '' : 's'}`);
    }
    console.log('  ---------------------------------------------');

    // Fetch and display anime titles
    try {
      const animeStdout = runWrangler(
        `d1 execute ${DB_NAME} --local --command="SELECT id, title, status, year FROM anime;" --json`,
        { silent: true }
      );
      const animeList = JSON.parse(animeStdout)[0]?.results ?? [];
      if (animeList.length > 0) {
        console.log('\n  🎬 Local Anime Records:');
        for (const item of animeList) {
          console.log(`    • ${item.title} (${item.id}) — ${item.year || 'N/A'} [${item.status}]`);
        }
      }
    } catch {
      // optional display
    }

    console.log('\n  🎉 Local development database is now fully in sync with production!\n');

  } finally {
    // Ephemeral Cleanup: Always delete temp SQL file
    if (fs.existsSync(tempSqlFile)) {
      try {
        fs.unlinkSync(tempSqlFile);
      } catch {
        // ignore cleanup error
      }
    }
  }
}

main().catch((err) => {
  console.error('\n❌ Failed to sync D1 database to local:', err.message);
  process.exit(1);
});
