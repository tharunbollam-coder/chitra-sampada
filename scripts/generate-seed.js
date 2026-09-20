import fs from 'node:fs';
import path from 'node:path';
import { animeList } from '../src/data/anime.js';

const franchiseDefs = {
  'naruto-shippuden': {
    franchiseId: 'naruto',
    franchiseName: 'Naruto',
    currentStepOrder: 2
  },
  'frieren': {
    franchiseId: 'frieren',
    franchiseName: "Frieren: Beyond Journey's End",
    currentStepOrder: 1
  },
  'odd-taxi': {
    franchiseId: 'odd-taxi',
    franchiseName: 'Odd Taxi',
    currentStepOrder: 1
  },
  'jujutsu-kaisen': {
    franchiseId: 'jujutsu-kaisen',
    franchiseName: 'Jujutsu Kaisen',
    currentStepOrder: 3
  },
  'vinland-saga': {
    franchiseId: 'vinland-saga',
    franchiseName: 'Vinland Saga',
    currentStepOrder: 2
  },
  'solo-leveling': {
    franchiseId: 'solo-leveling',
    franchiseName: 'Solo Leveling',
    currentStepOrder: 3
  },
  'dangers-in-my-heart': {
    franchiseId: 'dangers-in-my-heart',
    franchiseName: 'The Dangers in My Heart',
    currentStepOrder: 2
  },
  'apothecary-diaries': {
    franchiseId: 'apothecary-diaries',
    franchiseName: 'The Apothecary Diaries',
    currentStepOrder: 1
  },
  'mob-psycho-100': {
    franchiseId: 'mob-psycho-100',
    franchiseName: 'Mob Psycho 100',
    currentStepOrder: 3
  },
  'bleach-tybw': {
    franchiseId: 'bleach',
    franchiseName: 'Bleach',
    currentStepOrder: 3
  },
  'kaiju-no-8': {
    franchiseId: 'kaiju-no-8',
    franchiseName: 'Kaiju No. 8',
    currentStepOrder: 1
  },
  'kaguya-sama': {
    franchiseId: 'kaguya-sama',
    franchiseName: 'Kaguya-sama: Love Is War',
    currentStepOrder: 4
  }
};

function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  return "'" + String(val).replace(/'/g, "''") + "'";
}

const sqlStatements = [];
const insertedFranchises = new Set();

/*
// Data-insertion code commented out for production/manual data entry
for (const anime of animeList) {
  const fInfo = franchiseDefs[anime.id];
  const franchiseId = fInfo ? fInfo.franchiseId : anime.id;
  const franchiseName = fInfo ? fInfo.franchiseName : anime.title;

  if (!insertedFranchises.has(franchiseId)) {
    insertedFranchises.add(franchiseId);
    sqlStatements.push(`INSERT OR REPLACE INTO franchises (id, name, description) VALUES (${escapeSql(franchiseId)}, ${escapeSql(franchiseName)}, NULL);`);

    if (Array.isArray(anime.watchOrder)) {
      for (const step of anime.watchOrder) {
        const stepAnimeId = step.isCurrent ? anime.id : null;
        sqlStatements.push(
          `INSERT INTO franchise_watch_order (franchise_id, step_order, title, type, episodes, anime_id, note) VALUES (${escapeSql(franchiseId)}, ${step.order}, ${escapeSql(step.title)}, ${escapeSql(step.type)}, ${escapeSql(step.episodes)}, ${escapeSql(stepAnimeId)}, ${escapeSql(step.note)});`
        );
      }
    }
  }

  const reviewHeading = anime.review?.heading || null;
  const reviewParagraphs = anime.review?.paragraphs ? JSON.stringify(anime.review.paragraphs) : null;
  const source = anime.source || {};
  const power = anime.powerSystem || {};
  const powerParagraphs = power.paragraphs ? JSON.stringify(power.paragraphs) : (typeof power === 'string' ? JSON.stringify([power]) : null);
  const lessonHeading = anime.lessons?.heading || null;
  const lessonTakeaway = anime.lessons?.takeaway || (Array.isArray(anime.lessons?.paragraphs) ? anime.lessons.paragraphs[0] : null);

  sqlStatements.push(
    `INSERT OR REPLACE INTO anime (
      id, slug, title, original_title, year, episodes, status,
      personal_rating, poster, backdrop, added_date, last_updated,
      honesty_status, filler_percentage, trending, synopsis,
      franchise_id, franchise_step_order,
      review_heading, review_paragraphs,
      source_title, source_original_title, source_author, source_type,
      source_volumes, source_publication_status, source_adaptation_status,
      source_coverage, source_notes,
      power_system_name, power_system_paragraphs,
      lesson_heading, lesson_takeaway
    ) VALUES (
      ${escapeSql(anime.id)}, ${escapeSql(anime.slug)}, ${escapeSql(anime.title)}, ${escapeSql(anime.originalTitle)}, ${anime.year}, ${anime.episodes}, ${escapeSql(anime.status)},
      ${escapeSql(anime.personalRating)}, ${escapeSql(anime.poster)}, ${escapeSql(anime.backdrop)}, ${escapeSql(anime.addedDate)}, ${escapeSql(anime.lastUpdated)},
      ${escapeSql(anime.honestyStatus)}, ${anime.fillerPercentage}, ${anime.trending ? 1 : 0}, ${escapeSql(anime.synopsis)},
      ${escapeSql(franchiseId)}, ${escapeSql(fInfo ? fInfo.currentStepOrder : 1)},
      ${escapeSql(reviewHeading)}, ${escapeSql(reviewParagraphs)},
      ${escapeSql(source.title)}, ${escapeSql(source.originalTitle)}, ${escapeSql(source.author)}, ${escapeSql(source.type)},
      ${escapeSql(source.volumes)}, ${escapeSql(source.publicationStatus)}, ${escapeSql(source.adaptationStatus)},
      ${escapeSql(source.coverage)}, ${escapeSql(source.notes)},
      ${escapeSql(power.name)}, ${escapeSql(powerParagraphs)},
      ${escapeSql(lessonHeading)}, ${escapeSql(lessonTakeaway)}
    );`
  );

  if (Array.isArray(anime.aliases)) {
    for (const alias of anime.aliases) {
      sqlStatements.push(`INSERT OR REPLACE INTO anime_aliases (anime_id, alias) VALUES (${escapeSql(anime.id)}, ${escapeSql(alias)});`);
    }
  }

  if (Array.isArray(anime.genres)) {
    for (const genre of anime.genres) {
      sqlStatements.push(`INSERT OR REPLACE INTO anime_genres (anime_id, genre) VALUES (${escapeSql(anime.id)}, ${escapeSql(genre)});`);
    }
  }

  if (Array.isArray(anime.vibes)) {
    for (const vibeId of anime.vibes) {
      sqlStatements.push(`INSERT OR REPLACE INTO anime_vibes (anime_id, vibe_id) VALUES (${escapeSql(anime.id)}, ${escapeSql(vibeId)});`);
    }
  }

  if (anime.fillerList?.ranges && Array.isArray(anime.fillerList.ranges)) {
    let rOrder = 1;
    for (const r of anime.fillerList.ranges) {
      sqlStatements.push(
        `INSERT INTO anime_filler_ranges (anime_id, range, type, arc, range_order) VALUES (${escapeSql(anime.id)}, ${escapeSql(r.range)}, ${escapeSql(r.type)}, ${escapeSql(r.arc)}, ${rOrder++});`
      );
    }
  }

  if (Array.isArray(anime.characters)) {
    for (const c of anime.characters) {
      sqlStatements.push(
        `INSERT INTO anime_characters (anime_id, rank, name, category, role, commentary) VALUES (${escapeSql(anime.id)}, ${c.rank}, ${escapeSql(c.name)}, ${escapeSql(c.category)}, ${escapeSql(c.role)}, ${escapeSql(c.commentary)});`
      );
    }
  }
}

fs.writeFileSync('seed.sql', sqlStatements.join('\n'), 'utf8');
console.log('Successfully generated seed.sql with', sqlStatements.length, 'statements');
*/
console.log('Data-insertion code in generate-seed.js is commented out. No statements executed.');