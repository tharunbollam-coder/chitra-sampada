-- ==========================================
-- Chitra Sampada Remote Database Sync Script
-- ==========================================

-- 1. Apply Migration 0005 schema for anime_filler_ranges
DROP TABLE IF EXISTS anime_filler_ranges;

CREATE TABLE IF NOT EXISTS anime_filler_ranges (
  anime_id TEXT NOT NULL,
  type TEXT NOT NULL,
  episodes TEXT NOT NULL,
  episode_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (anime_id, type),
  FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_anime_filler_type ON anime_filler_ranges(anime_id, type);

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_anime_year_title ON anime(year DESC, title ASC);

-- 3. Mark migrations 0005 and 0006 as applied
INSERT OR REPLACE INTO d1_migrations (id, name, applied_at)
VALUES 
  (5, '0005_simplify_filler_ranges.sql', datetime('now')),
  (6, '0006_add_section_visibility.sql', datetime('now'));

-- 4. Sync Table Data

-- Table: franchises (2 rows)
INSERT OR REPLACE INTO franchises (id, name, description) VALUES ('frieren', 'Frieren: Beyond Journey''s End', NULL);
INSERT OR REPLACE INTO franchises (id, name, description) VALUES ('naruto', 'Naruto', 'The complete multi-generational epic of Naruto Uzumaki, from the genin days of the Hidden Leaf through the Fourth Shinobi World War and into the new era.');

-- Table: franchise_watch_order (5 rows)
INSERT OR REPLACE INTO franchise_watch_order (id, franchise_id, step_order, title, type, episodes, anime_id, note) VALUES (8, 'frieren', 1, 'Frieren: Beyond Journey''s End (Season 1)', 'TV Series', '28 Episodes', 'frieren', 'Complete Season 1 covering chapters 1 to 60.');
INSERT OR REPLACE INTO franchise_watch_order (id, franchise_id, step_order, title, type, episodes, anime_id, note) VALUES (36, 'naruto', 1, 'Naruto (Original Series)', 'TV Series', '220 Episodes', 'naruto', 'Part 1: Covers the classic foundational genin and Chunin Exam arcs.');
INSERT OR REPLACE INTO franchise_watch_order (id, franchise_id, step_order, title, type, episodes, anime_id, note) VALUES (37, 'naruto', 2, 'Naruto Movies', 'Movie', '11 Movies', 'naruto-movies', 'Standalone theatrical features across Part 1, Shippuden, plus The Last (canon).');
INSERT OR REPLACE INTO franchise_watch_order (id, franchise_id, step_order, title, type, episodes, anime_id, note) VALUES (38, 'naruto', 3, 'Naruto: Shippuden', 'TV Series', '500 Episodes', 'naruto-shippuden', 'Part 2: The teenage years, the Akatsuki threat, and the Fourth Great Ninja War.');
INSERT OR REPLACE INTO franchise_watch_order (id, franchise_id, step_order, title, type, episodes, anime_id, note) VALUES (39, 'naruto', 4, 'Boruto: Naruto Next Generations', 'TV Series', '293 Episodes', 'boruto', 'Sequel series following Naruto''s son Boruto and the Otsutsuki conflict.');

-- Table: anime (6 rows)
INSERT OR REPLACE INTO anime (id, slug, title, original_title, year, episodes, status, personal_rating, poster, backdrop, added_date, last_updated, honesty_status, filler_percentage, trending, synopsis, franchise_id, franchise_step_order, review_heading, review_paragraphs, source_title, source_original_title, source_author, source_type, source_volumes, source_publication_status, source_adaptation_status, source_coverage, source_notes, power_system_name, power_system_paragraphs, lesson_heading, lesson_takeaway, section_visibility) VALUES ('frieren', 'frieren-beyond-journeys-end', 'Frieren: Beyond Journey''s End', '葬送のフリーレン (Sousou no Frieren)', 2023, 28, 'Finished Airing', 9.8, 'https://image.tmdb.org/t/p/w780/dqZENchTd7lp5zht7BdlqM7RBhD.jpg', 'https://image.tmdb.org/t/p/w1280/5MAq48e77aP78s2C3sZl8Xm3J8d.jpg', 'Jan 15, 2024', '2026-09-22', 'watched', 0, 1, 'An immortal elf mage and her human companions defeat the Demon King. But after 50 years pass and her former friends begin to pass away, she embarks on a quiet journey to understand the brevity of human life.', 'frieren', 1, 'The Rare Anime That Transcends Its Medium', '["Frieren is easily one of the greatest anime I have ever seen. What makes it so special isn’t just the jaw-dropping animation by Madhouse or Evan Call’s majestic orchestral score — it is the quiet, patient maturity in how it approaches grief, memory, and ordinary everyday moments.","It takes a few episodes to settle into its relaxed rhythm, so if you go in expecting non-stop shonen tournament battles, the deliberate pacing might catch you off guard at first. But once the world opens up, every single interaction carries genuine weight. The magic exam arc in the second half manages to be tactically exhilarating while preserving the introspective soul of the story."]', 'Frieren: Beyond Journey''s End', '葬送のフリーレン', 'Kanehito Yamada (Story), Tsukasa Abe (Art)', 'Manga', '13+ Volumes (Ongoing)', 'Ongoing', 'Ongoing Adaptation', 'Season 1 adapts Chapters 1 through 60 (up to the conclusion of the First-Class Mage Exam).', 'To continue where the anime left off, start reading at Chapter 61 (Volume 7).', 'Mana Visualization & Classical Spellcraft', '["Magic in Frieren operates on visualization: a mage cannot manifest a spell unless they can clearly and concretely picture it in their mind. What cannot be visualized is strictly impossible.","Mana control is vital. Skilled mages suppress their leaking mana to fool demon predators into underestimating their lethal range. Combat spells are fast, direct, and lethal, where a single second of distraction results in defeat.","Folk magic (cleaning clothes, turning sweet grapes sour) exists alongside combat spells, representing the everyday beauty of living in a peaceful world."]', 'The Precious Value of Ordinary Time', 'We live as if we have an infinite supply of tomorrows. Kindness, shared memories, and small everyday moments are the only things that truly survive us.', NULL);
INSERT OR REPLACE INTO anime (id, slug, title, original_title, year, episodes, status, personal_rating, poster, backdrop, added_date, last_updated, honesty_status, filler_percentage, trending, synopsis, franchise_id, franchise_step_order, review_heading, review_paragraphs, source_title, source_original_title, source_author, source_type, source_volumes, source_publication_status, source_adaptation_status, source_coverage, source_notes, power_system_name, power_system_paragraphs, lesson_heading, lesson_takeaway, section_visibility) VALUES ('naruto', 'naruto', 'Naruto', 'ナルト', 2002, 220, 'Finished', 8.5, '', '', '2026-09-22', '2026-09-22', 'watched', 42, 1, 'Naruto Uzumaki, a mischievous adolescent ninja...', 'naruto', 1, 'The Defining Shonen Journey of Our Generation', '["Naruto Part 1 is a masterclass in establishing emotional stakes, unforgettable tournament arcs, and rivalries that define modern anime.","The Land of Waves and Chunin Exams arcs remain timeless benchmarks in battle storytelling, elevated by Toshiro Masuda’s legendary soundtrack."]', 'Naruto', NULL, 'Masashi Kishimoto', 'Manga', 'Volumes 1–27 (Chapters 1–238)', 'Completed', NULL, 'Fully adapts Part 1 of the manga up to the timeskip.', 'For the purest experience, stop after episode 135 and watch the final minutes of episode 220 before moving to Shippuden.', 'Chakra & Ninjutsu', '["Chakra is the fundamental energy produced by blending physical and spiritual energies, molded via hand signs to perform Ninjutsu, Genjutsu, or Taijutsu.","The system expands with Five Basic Nature Transformations (Fire, Wind, Lightning, Earth, Water) and rare bloodline limits (Kekkei Genkai) like the Sharingan and Byakugan."]', 'The Weight of Acknowledgment and Hard Work', 'Hard work and empathy can reshape destiny.', '{"review":true,"lessons":true,"watchOrder":true,"fillerList":true,"characters":true,"source":true,"powerSystem":true}');
INSERT OR REPLACE INTO anime (id, slug, title, original_title, year, episodes, status, personal_rating, poster, backdrop, added_date, last_updated, honesty_status, filler_percentage, trending, synopsis, franchise_id, franchise_step_order, review_heading, review_paragraphs, source_title, source_original_title, source_author, source_type, source_volumes, source_publication_status, source_adaptation_status, source_coverage, source_notes, power_system_name, power_system_paragraphs, lesson_heading, lesson_takeaway, section_visibility) VALUES ('naruto-movies', 'naruto-movies', 'Naruto Movies Collection', '劇場版 NARUTO -ナルト-', 2004, 11, 'Finished', 7, 'https://image.tmdb.org/t/p/w780/bT329H9q6f7N8C6fS9qQ7lY0w.jpg', 'https://image.tmdb.org/t/p/w1280/vIjyK706i8qfU3556gVvJ8Z8V6X.jpg', '', '2026-09-21', 'watched', 82, 0, 'A theatrical collection spanning the original series and Shippuden, featuring high-budget standalone adventures along with the officially canon romance finale, The Last: Naruto the Movie.', 'naruto', 2, 'Cinematic Spectacle Mixed with One Crucial Canon Milestone', '["While most Naruto movies are fun non-canon spectacles with elevated animation, \"The Last: Naruto the Movie\" is essential canon viewing that finally cements Naruto and Hinata''s romance prior to the series epilogue."]', 'Original Screenplays & Kishimoto Concept Art', NULL, 'Masashi Kishimoto / Studio Pierrot', 'Light Novel', '11 Novelizations', 'Completed', NULL, 'Most films are anime-original; The Last and Boruto the Movie had canon story supervised directly by Masashi Kishimoto.', 'Watch "The Last" strictly between Shippuden episodes 493 and 494 for maximum chronological impact.', 'Tenseigan & Celestial Chakra', '["In addition to standard jutsu, the films introduce unique celestial mechanics such as the Tenseigan, awakened by combining Otsutsuki chakra with the pure Byakugan."]', 'Love Requires Vulnerability and Open Expression', 'Through "The Last", the series demonstrated that courage in battle means little if one lacks the bravery to articulate one''s true feelings to the people they cherish.', NULL);
INSERT OR REPLACE INTO anime (id, slug, title, original_title, year, episodes, status, personal_rating, poster, backdrop, added_date, last_updated, honesty_status, filler_percentage, trending, synopsis, franchise_id, franchise_step_order, review_heading, review_paragraphs, source_title, source_original_title, source_author, source_type, source_volumes, source_publication_status, source_adaptation_status, source_coverage, source_notes, power_system_name, power_system_paragraphs, lesson_heading, lesson_takeaway, section_visibility) VALUES ('naruto-shippuden', 'naruto-shippuden', 'Naruto: Shippuden', 'NARUTO -ナルト- 疾風伝', 2007, 500, 'Finished', 9, 'https://image.tmdb.org/t/p/w780/kV27gZqdaUQmFO3m6rEcvEpWzZN.jpg', 'https://image.tmdb.org/t/p/w1280/vIjyK706i8qfU3556gVvJ8Z8V6X.jpg', '', '2026-09-21', 'watched', 4, 1, 'Naruto returns to the Hidden Leaf after two and a half years of rigorous training with Jiraiya, facing the looming threat of the Akatsuki organization as they hunt down the world''s Tailed Beasts.', 'naruto', 3, 'A Flawed Epic That Soars to Unmatched Emotional Heights', '["When Shippuden hits its peaks—Jiraiya vs Pain, Kakashi vs Obito, and Naruto''s dialogue with Nagato—it stands among the finest storytelling in anime history.","Skipping the 40% filler bloat is essential to experiencing the narrative at its best pacing."]', 'Naruto (Part II)', NULL, 'Masashi Kishimoto', 'Manga', 'Volumes 28–72 (Chapters 239–700)', 'Completed', NULL, 'Adapts the remainder of Kishimoto''s original 700-chapter manga run plus light novel epilogues.', 'The light novel epilogues (Itachi Shinden, Sasuke Shinden, Shikamaru Hiden) are adapted in the 450s-490s.', 'Sage Jutsu, Tailed Beast Modes & Six Paths Chakra', '["Shippuden expands chakra dynamics with Senjutsu (natural energy gathered while remaining motionless), Mangekyo Sharingan abilities (Amaterasu, Tsukuyomi, Susanoo), and the divine Six Paths powers bestowed by Hagoromo Otsutsuki."]', 'Breaking the Cycle of Hatred', 'Shippuden delves deeply into how pain begets pain. Peace cannot be enforced through superior terror; it must be built on the agonizing labor of mutual understanding.', NULL);
INSERT OR REPLACE INTO anime (id, slug, title, original_title, year, episodes, status, personal_rating, poster, backdrop, added_date, last_updated, honesty_status, filler_percentage, trending, synopsis, franchise_id, franchise_step_order, review_heading, review_paragraphs, source_title, source_original_title, source_author, source_type, source_volumes, source_publication_status, source_adaptation_status, source_coverage, source_notes, power_system_name, power_system_paragraphs, lesson_heading, lesson_takeaway, section_visibility) VALUES ('boruto', 'boruto-naruto-next-generations', 'Boruto: Naruto Next Generations', 'BORUTO -ボルト- NARUTO NEXT GENERATIONS', 2017, 293, 'Finished', 6.8, 'https://image.tmdb.org/t/p/w780/hT0oVfKjG74kLwR59Z4wQ7lY0w.jpg', 'https://image.tmdb.org/t/p/w1280/vIjyK706i8qfU3556gVvJ8Z8V6X.jpg', '', '2026-09-21', 'watching', 48, 0, 'The life of the shinobi is beginning to change. Boruto Uzumaki, son of Seventh Hokage Naruto, has joined the ninja academy to walk his own path in a modernized ninja world facing alien threats.', 'naruto', 4, 'High Peaks Overshadowed by Inconsistent Modern Pacing', '["While the anime-original slice-of-life episodes dilute momentum, Boruto delivers phenomenal animation highlights when adapting manga canon—especially the legendary Naruto and Sasuke vs Momoshiki duel in episode 65."]', 'Boruto: Naruto Next Generations / Two Blue Vortex', NULL, 'Ukyo Kodachi & Masashi Kishimoto / Mikio Ikemoto', 'Manga', '20 Volumes (Part 1 Completed) / Part 2 Ongoing', 'Ongoing', NULL, 'Adapts up to Chapter 67 (Omnipotence Arc prelude).', 'The sequel manga Boruto: Two Blue Vortex takes place after a 3-year timeskip.', 'Karma, Scientific Ninja Tools & Otsutsuki Shinjutsu', '["Boruto evolves beyond traditional chakra by introducing Otsutsuki biological compression (Karma seals), cyborg scientific enhancements, and divine Shinjutsu—the divine precursor miraculous abilities behind all ninjutsu."]', 'Forging an Identity Beyond Your Parents'' Shadows', 'Boruto illustrates the friction between a generation shaped by peace and their war-veteran parents, showing that identity is not inherited—it must be earned through personal struggle.', NULL);
INSERT OR REPLACE INTO anime (id, slug, title, original_title, year, episodes, status, personal_rating, poster, backdrop, added_date, last_updated, honesty_status, filler_percentage, trending, synopsis, franchise_id, franchise_step_order, review_heading, review_paragraphs, source_title, source_original_title, source_author, source_type, source_volumes, source_publication_status, source_adaptation_status, source_coverage, source_notes, power_system_name, power_system_paragraphs, lesson_heading, lesson_takeaway, section_visibility) VALUES ('one-piece', 'one-piece', 'One Piece', 'One Piece', 1999, 1168, 'Currently Airing', 9.5, 'https://media.themoviedb.org/t/p/w440_and_h660_face/uiIB9ctqZFbfRXXimtpmZb5dusi.jpg', '', '2026-09-22', '2026-09-22', 'watched', 0, 1, 'Decades after the greatest pirate to ever sail, Gol D. Roger, was executed and revealed the existence of a legendary treasure called the One Piece, the seas have been consumed by an age of pirates all chasing the same prize. Monkey D. Luffy, a boy who ate a mysterious Devil Fruit as a kid and found his body turned to rubber, sets out from his sleepy village with nothing but a straw hat and a promise to become the next Pirate King. Along the way he gathers a crew of wildly different people — a swordsman, a navigator, a sniper, a cook, and others just as memorable — who come from different pasts and dreams but slowly learn to trust, protect, and love each other like family. What starts as one boy''s reckless voyage grows into a sprawling adventure across islands ruled by tyrant kings, ancient conspiracies, and a World Government determined to keep its secrets buried. It''s a story about found family and stubborn hope, told at an almost absurd scale, where the joy is as much in the journey''s texture as in the destination.', NULL, NULL, 'One Piece: From ‘Maybe Later’ to One of My Favorites', '["One Piece is one of the biggest anime I''ve ever watched, not just in terms of episode count, but also in terms of its world-building and the sheer number of great characters it has. When I was searching for something new to watch, I came across it, checked out social media and the web, and found so many positive reviews. Then I found out it had over 1000 episodes. Because of that number, I kept telling myself \"next time\" and pushing it back, even though I wanted to watch it after seeing all those reviews. I''m still not totally sure if it was the episode count itself that made me delay it, or something else entirely, but that''s what ended up happening.\n\nThen, after some time, I came across the One Piece live-action series. I started watching it in 2023, and after finishing the first season, I found myself wondering if I should finally start the anime too. So I did. The early episodes felt kind of normal, I''m not sure if that was because of the show itself or because I''d already watched the live action first. But after a few episodes, I got completely hooked, and I remember thinking, \"why did I delay this great show for so long?\"\n\nThose early episodes feel normal mostly because they''re focused on recruiting crew members, but looking at the bigger picture, those early arcs are what build the bond between Luffy and his crew. The biggest reason I ended up watching every single episode is the world-building — it''s incredible. Different cultures, different kinds of islands, their histories, and on top of that, the character development. Most of the main characters have their backstories explored deeply, and that''s what makes the world feel even richer.\n\nI like every character in this show, but my favorite is Zoro. A lot of fans have noticed that whenever Zoro''s involved in an action scene, the animation quality somehow gets even better. I don''t know why, but I feel that way too, and I honestly think the creator might have a soft spot for him as well. I like all the other characters too: Luffy the protagonist, Sanji, Usopp, Nami, Robin, Chopper, Brook, Franky, Jinbe, and Shanks. Speaking of Shanks, I really like his character, and I''ve been waiting for him to get into a proper battle. It''s like how everyone has that one character they''re just eager to see in an action scene, and for me, he''s one of them. But honestly, there are so many characters like that in this show, ones everyone''s been waiting to see fight.\n\nI really appreciate the author for all of this — honestly, to me, he''s simply the best, and \"appreciation\" almost feels like too small a word for what this man has built. There''s so much I could say about why this show is great, but this is easily one of my favorite anime of all time. And it''s more than just a favorite, there''s just so much more to it than that."]', NULL, NULL, NULL, 'Manga', NULL, 'Ongoing', NULL, NULL, NULL, 'Devil Fruits & Haki', '["Devil Fruits are mysterious, mystical fruits found throughout the world that grant the eater a permanent, unique superhuman ability at the cost of losing the ability to swim. They are categorized into three types: Paramecia (offering diverse superhuman bodily powers or environmental generation), Zoan (allowing physical transformation into animals or mythical creatures), and Logia (granting the ability to transform the body into and infinitely generate natural elements).\n\nHaki is a dormant, spiritual energy present in all living beings that can be awakened through intense training or extreme shock in battle. It is divided into three distinct disciplines: Observation Haki (enhancing spatial perception and granting momentary precognition), Armament Haki (creating an invisible armor of spiritual energy for defense and bypassing Devil Fruit invulnerabilities), and Conqueror''s Haki (an exceedingly rare, innate ability to overpower and physically knock out those with weaker wills).\n\nThe interplay between Devil Fruits and Haki forms the foundational combat scaling in the Grand Line and New World. While Devil Fruits provide immense tactical versatility and raw destructive capability, mastery of advanced Haki is strictly essential for top-tier fighters to counter elemental intangibility, project invisible physical force, and enforce their own willpower over the world''s most formidable adversaries."]', NULL, NULL, '{"review":true,"watchOrder":true,"fillerList":true,"characters":false,"source":false,"powerSystem":true}');

-- Table: anime_aliases (14 rows)
INSERT OR REPLACE INTO anime_aliases (anime_id, alias) VALUES ('frieren', 'frieren');
INSERT OR REPLACE INTO anime_aliases (anime_id, alias) VALUES ('frieren', 'frieren-beyond-journeys-end');
INSERT OR REPLACE INTO anime_aliases (anime_id, alias) VALUES ('naruto-movies', 'Naruto Theatrical Films');
INSERT OR REPLACE INTO anime_aliases (anime_id, alias) VALUES ('naruto-movies', 'Naruto Films');
INSERT OR REPLACE INTO anime_aliases (anime_id, alias) VALUES ('naruto-shippuden', 'Naruto Part 2');
INSERT OR REPLACE INTO anime_aliases (anime_id, alias) VALUES ('naruto-shippuden', 'Shippuden');
INSERT OR REPLACE INTO anime_aliases (anime_id, alias) VALUES ('naruto-shippuden', 'Hurricane Chronicles');
INSERT OR REPLACE INTO anime_aliases (anime_id, alias) VALUES ('boruto', 'Boruto Part 1');
INSERT OR REPLACE INTO anime_aliases (anime_id, alias) VALUES ('boruto', 'Boruto');
INSERT OR REPLACE INTO anime_aliases (anime_id, alias) VALUES ('one-piece', 'OP');
INSERT OR REPLACE INTO anime_aliases (anime_id, alias) VALUES ('one-piece', 'Wan Pisu');
INSERT OR REPLACE INTO anime_aliases (anime_id, alias) VALUES ('one-piece', 'ワンピース');
INSERT OR REPLACE INTO anime_aliases (anime_id, alias) VALUES ('naruto', 'Naruto (2002)');
INSERT OR REPLACE INTO anime_aliases (anime_id, alias) VALUES ('naruto', 'Naruto Part 1');

-- Table: anime_genres (26 rows)
INSERT OR REPLACE INTO anime_genres (anime_id, genre) VALUES ('frieren', 'Fantasy');
INSERT OR REPLACE INTO anime_genres (anime_id, genre) VALUES ('frieren', 'Adventure');
INSERT OR REPLACE INTO anime_genres (anime_id, genre) VALUES ('frieren', 'Drama');
INSERT OR REPLACE INTO anime_genres (anime_id, genre) VALUES ('frieren', 'Slice of Life');
INSERT OR REPLACE INTO anime_genres (anime_id, genre) VALUES ('naruto-movies', 'Action');
INSERT OR REPLACE INTO anime_genres (anime_id, genre) VALUES ('naruto-movies', 'Adventure');
INSERT OR REPLACE INTO anime_genres (anime_id, genre) VALUES ('naruto-movies', 'Fantasy');
INSERT OR REPLACE INTO anime_genres (anime_id, genre) VALUES ('naruto-shippuden', 'Action');
INSERT OR REPLACE INTO anime_genres (anime_id, genre) VALUES ('naruto-shippuden', 'Adventure');
INSERT OR REPLACE INTO anime_genres (anime_id, genre) VALUES ('naruto-shippuden', 'Fantasy');
INSERT OR REPLACE INTO anime_genres (anime_id, genre) VALUES ('naruto-shippuden', 'Drama');
INSERT OR REPLACE INTO anime_genres (anime_id, genre) VALUES ('boruto', 'Action');
INSERT OR REPLACE INTO anime_genres (anime_id, genre) VALUES ('boruto', 'Adventure');
INSERT OR REPLACE INTO anime_genres (anime_id, genre) VALUES ('boruto', 'Fantasy');
INSERT OR REPLACE INTO anime_genres (anime_id, genre) VALUES ('boruto', 'Sci-Fi');
INSERT OR REPLACE INTO anime_genres (anime_id, genre) VALUES ('one-piece', 'Adventure');
INSERT OR REPLACE INTO anime_genres (anime_id, genre) VALUES ('one-piece', 'Fantasy');
INSERT OR REPLACE INTO anime_genres (anime_id, genre) VALUES ('one-piece', 'Action');
INSERT OR REPLACE INTO anime_genres (anime_id, genre) VALUES ('one-piece', 'Drama');
INSERT OR REPLACE INTO anime_genres (anime_id, genre) VALUES ('one-piece', 'Comedy');
INSERT OR REPLACE INTO anime_genres (anime_id, genre) VALUES ('one-piece', 'Mystery');
INSERT OR REPLACE INTO anime_genres (anime_id, genre) VALUES ('one-piece', 'Supernatural');
INSERT OR REPLACE INTO anime_genres (anime_id, genre) VALUES ('one-piece', 'Thriller');
INSERT OR REPLACE INTO anime_genres (anime_id, genre) VALUES ('naruto', 'Action');
INSERT OR REPLACE INTO anime_genres (anime_id, genre) VALUES ('naruto', 'Adventure');
INSERT OR REPLACE INTO anime_genres (anime_id, genre) VALUES ('naruto', 'Fantasy');

-- Table: anime_vibes (10 rows)
INSERT OR REPLACE INTO anime_vibes (anime_id, vibe_id) VALUES ('frieren', 'zero-filler');
INSERT OR REPLACE INTO anime_vibes (anime_id, vibe_id) VALUES ('frieren', 'hidden-gems');
INSERT OR REPLACE INTO anime_vibes (anime_id, vibe_id) VALUES ('frieren', 'beginners');
INSERT OR REPLACE INTO anime_vibes (anime_id, vibe_id) VALUES ('naruto-movies', 'classic-staples');
INSERT OR REPLACE INTO anime_vibes (anime_id, vibe_id) VALUES ('naruto-shippuden', 'classic-staples');
INSERT OR REPLACE INTO anime_vibes (anime_id, vibe_id) VALUES ('naruto-shippuden', 'overpowered-mc');
INSERT OR REPLACE INTO anime_vibes (anime_id, vibe_id) VALUES ('boruto', 'classic-staples');
INSERT OR REPLACE INTO anime_vibes (anime_id, vibe_id) VALUES ('one-piece', 'op-mc');
INSERT OR REPLACE INTO anime_vibes (anime_id, vibe_id) VALUES ('naruto', 'action-hype');
INSERT OR REPLACE INTO anime_vibes (anime_id, vibe_id) VALUES ('naruto', 'emotional-depth');

-- Table: anime_characters (17 rows)
INSERT OR REPLACE INTO anime_characters (id, anime_id, rank, name, category, role, commentary) VALUES (6, 'frieren', 1, 'Frieren', 'Best Written', 'Mage • The Slayer', 'A thousand-year-old elf whose quiet growth and sudden bursts of tactical genius redefine fantasy protagonists.');
INSERT OR REPLACE INTO anime_characters (id, anime_id, rank, name, category, role, commentary) VALUES (7, 'frieren', 2, 'Himmel the Hero', 'Fan Favorite', 'Leader of the Hero Party', 'A hero whose vanity is overshadowed only by his profound kindness and enduring influence on everyone he met.');
INSERT OR REPLACE INTO anime_characters (id, anime_id, rank, name, category, role, commentary) VALUES (8, 'frieren', 3, 'Fern', 'Strongest Prodigy', 'Ordinary Offensive Mage', 'Master of basic speed casting, proving that perfect fundamentals beat flashy magic every time.');
INSERT OR REPLACE INTO anime_characters (id, anime_id, rank, name, category, role, commentary) VALUES (9, 'frieren', 4, 'Stark', 'Most Underrated', 'Warrior • Vanguard', 'Terrified before every fight, yet stands firm when it matters most.');
INSERT OR REPLACE INTO anime_characters (id, anime_id, rank, name, category, role, commentary) VALUES (40, 'naruto-movies', 1, 'Hinata Hyuga', 'Protagonist', 'Byakugan Heiress & Naruto''s Partner', 'Takes center stage in The Last, showcasing both inner strength and devotion.');
INSERT OR REPLACE INTO anime_characters (id, anime_id, rank, name, category, role, commentary) VALUES (41, 'naruto-movies', 2, 'Toneri Otsutsuki', 'Antagonist', 'Descendant of Hamura', 'Threatens Earth from the Moon in a bid to cleanse the shinobi world.');
INSERT OR REPLACE INTO anime_characters (id, anime_id, rank, name, category, role, commentary) VALUES (42, 'naruto-shippuden', 1, 'Pain / Nagato', 'Antagonist', 'Leader of Akatsuki & God of Amegakure', 'A tragic revolutionary who tested Naruto''s worldview to its absolute core.');
INSERT OR REPLACE INTO anime_characters (id, anime_id, rank, name, category, role, commentary) VALUES (43, 'naruto-shippuden', 2, 'Itachi Uchiha', 'Supporting', 'Rogue Shinobi of Konoha', 'A martyr who shouldered the darkest burdens to protect his village and brother from the shadows.');
INSERT OR REPLACE INTO anime_characters (id, anime_id, rank, name, category, role, commentary) VALUES (44, 'naruto-shippuden', 3, 'Madara Uchiha', 'Antagonist', 'Legendary Ghost of the Uchiha', 'An overwhelming force of nature whose sheer presence redefined power scaling in the series.');
INSERT OR REPLACE INTO anime_characters (id, anime_id, rank, name, category, role, commentary) VALUES (45, 'boruto', 1, 'Boruto Uzumaki', 'Protagonist', 'Seventh Hokage''s Son & Karma Vessel', 'Rebellious prodigy determined to forge a different path from his father as a shinobi shadow.');
INSERT OR REPLACE INTO anime_characters (id, anime_id, rank, name, category, role, commentary) VALUES (46, 'boruto', 2, 'Kawaki', 'Main', 'Adopted Uzumaki & Karma Vessel', 'A severely traumatized youth who develops an intense, obsessive protectiveness toward Naruto.');
INSERT OR REPLACE INTO anime_characters (id, anime_id, rank, name, category, role, commentary) VALUES (47, 'boruto', 3, 'Sarada Uchiha', 'Main', 'Sasuke and Sakura''s Daughter', 'An ambitious Sharingan wielder aiming to become the next Hokage.');
INSERT OR REPLACE INTO anime_characters (id, anime_id, rank, name, category, role, commentary) VALUES (51, 'one-piece', 1, 'Monkey D. Luffy', 'Main', 'Captain of the Straw Hat Pirates / Emperor of the Sea', 'An ever-optimistic and fiercely loyal pirate who values freedom above all else. He utilizes the stretchy properties of his Gum-Gum Devil Fruit to unleash devastating physical attacks and transform into various combat');
INSERT OR REPLACE INTO anime_characters (id, anime_id, rank, name, category, role, commentary) VALUES (52, 'one-piece', 2, 'Roronoa Zoro', 'Main', 'Swordsman / First Mate', 'A stern and immensely dedicated swordsman striving to become the world''s strongest. He fights using his signature Three-Sword Style (Santoryu), holding one sword in his mouth and two in his hands.');
INSERT OR REPLACE INTO anime_characters (id, anime_id, rank, name, category, role, commentary) VALUES (53, 'naruto', 1, 'Naruto Uzumaki', 'Protagonist', 'Nine-Tails Jinchuriki & Genin', 'An outcast driven by an unshakeable dream to earn the village''s respect as Hokage.');
INSERT OR REPLACE INTO anime_characters (id, anime_id, rank, name, category, role, commentary) VALUES (54, 'naruto', 2, 'Sasuke Uchiha', 'Protagonist', 'Avenger & Last Uchiha', 'A prodigy consumed by vengeance against his brother Itachi.');
INSERT OR REPLACE INTO anime_characters (id, anime_id, rank, name, category, role, commentary) VALUES (55, 'naruto', 3, 'Kakashi Hatake', 'Supporting', 'Team 7 Sensei & Copy Ninja', 'The laid-back yet fiercely capable mentor carrying unseen grief.');

-- Table: anime_filler_ranges (16 rows)
INSERT OR REPLACE INTO anime_filler_ranges (anime_id, type, episodes, episode_count) VALUES ('frieren', 'Manga Canon', '1-28', 28);
INSERT OR REPLACE INTO anime_filler_ranges (anime_id, type, episodes, episode_count) VALUES ('naruto-movies', 'Manga Canon', '10, 11', 2);
INSERT OR REPLACE INTO anime_filler_ranges (anime_id, type, episodes, episode_count) VALUES ('naruto-movies', 'Filler', '1-9', 9);
INSERT OR REPLACE INTO anime_filler_ranges (anime_id, type, episodes, episode_count) VALUES ('boruto', 'Manga Canon', '181-220, 287-293', 47);
INSERT OR REPLACE INTO anime_filler_ranges (anime_id, type, episodes, episode_count) VALUES ('boruto', 'Anime Canon', '1-66', 66);
INSERT OR REPLACE INTO anime_filler_ranges (anime_id, type, episodes, episode_count) VALUES ('boruto', 'Filler', '67-140, 221-286', 140);
INSERT OR REPLACE INTO anime_filler_ranges (anime_id, type, episodes, episode_count) VALUES ('naruto-shippuden', 'Manga Canon', '1-53, 72-175, 197-479, 480-500', 461);
INSERT OR REPLACE INTO anime_filler_ranges (anime_id, type, episodes, episode_count) VALUES ('naruto-shippuden', 'Mixed Canon/Filler', '54-71', 18);
INSERT OR REPLACE INTO anime_filler_ranges (anime_id, type, episodes, episode_count) VALUES ('naruto-shippuden', 'Filler', '176-196', 21);
INSERT OR REPLACE INTO anime_filler_ranges (anime_id, type, episodes, episode_count) VALUES ('one-piece', 'Manga Canon', '1-44, 48-49, 52-53, 62-67, 70-92, 94-97, 100, 103-130, 144-195, 207-212, 217-219, 227-278, 284-290, 293-302, 304-316, 320-325, 337-353, 355-381, 385-405, 408-417, 422-425, 430-452, 459-488, 490-491, 493-496, 500-505, 507-519, 521-541, 543-573, 579-589, 591-624, 629-632, 634-652, 654-656, 658-678, 680-689, 691-730, 732-736, 739-746, 752-774, 776, 779, 783-788, 790-802, 804-806, 808-877, 880, 886, 891-894, 897-906, 908-923, 925-987, 990, 992-1028, 1031-1083, 1085-1168', 1010);
INSERT OR REPLACE INTO anime_filler_ranges (anime_id, type, episodes, episode_count) VALUES ('one-piece', 'Anime Canon', '50-51, 93, 213-216, 418-420, 453-456, 497-499, 506, 737, 775, 1084', 21);
INSERT OR REPLACE INTO anime_filler_ranges (anime_id, type, episodes, episode_count) VALUES ('one-piece', 'Mixed Canon/Filler', '45-47, 61, 68-69, 101, 226, 354, 421, 489, 520, 574, 625, 628, 633, 653, 657, 679, 690, 731, 738, 751, 777-778, 789, 803, 807, 878-879, 881-885, 887-890, 924, 988-989, 991', 43);
INSERT OR REPLACE INTO anime_filler_ranges (anime_id, type, episodes, episode_count) VALUES ('one-piece', 'Filler', '54-60, 98-99, 102, 131-143, 196-206, 220-225, 279-283, 291-292, 303, 317-319, 326-336, 382-384, 406-407, 426-429, 457-458, 492, 542, 575-578, 590, 626-627, 747-750, 780-782, 895-896, 907, 1029-1030', 94);
INSERT OR REPLACE INTO anime_filler_ranges (anime_id, type, episodes, episode_count) VALUES ('naruto', 'Manga Canon', '1-25, 27-96, 98, 100, 107-135, 220', 127);
INSERT OR REPLACE INTO anime_filler_ranges (anime_id, type, episodes, episode_count) VALUES ('naruto', 'Anime Canon', '99', 1);
INSERT OR REPLACE INTO anime_filler_ranges (anime_id, type, episodes, episode_count) VALUES ('naruto', 'Filler', '26, 97, 101-106, 136-219', 92);

-- Table: blog_posts (3 rows)
INSERT OR REPLACE INTO blog_posts (id, slug, title, excerpt, content, published_date, last_updated, status) VALUES ('post-what-is-anime-filler', 'what-is-anime-filler', 'What Is Anime Filler and Why Does It Exist?', 'A clear, honest breakdown of what anime filler actually is, why studios had to produce it, and how modern seasonal releases changed everything.', '## The Question Every Anime Viewer Eventually Asks

When you start getting deeper into anime, you will inevitably hit an episode that feels completely detached from everything that came before it. The stakes suddenly drop, the animation style might shift slightly, and characters you care about spend twenty minutes searching for a lost cat or competing in an impromptu cooking contest.

Then, ten or twenty episodes later, the series snaps right back to the dramatic life-or-death battle as if none of those detours ever happened.

Welcome to the world of **anime filler**.

---

## What Exactly Is Filler?

In the anime industry, "filler" refers to content produced for a television adaptation that was **not present in the original source material** (usually a manga, light novel, or game). 

Because most anime series are adaptations of ongoing publications, the animation studio often faces a mathematical dilemma:
- A weekly manga chapter typically contains **15 to 20 pages**.
- A single 24-minute anime episode typically adapts **2 to 3 manga chapters**.

If an anime studio produces an episode every single week without a break, the anime will consume source material roughly twice to three times as fast as the original author can draw it. Eventually, the anime catches up to the author''s current chapter.

When that happens, the studio has only three choices:
1. Stop airing the show and wait (which TV broadcast contracts historically made very difficult).
2. Diverge completely and write their own original ending.
3. Produce "filler" episodes to buy the author time to get ahead again.

---

## The Golden Age of Fillers: Long-Running Shonen

The classic era of weekly long-running shonen—including legendary titles like [Naruto Shippuden](/anime/naruto-shippuden) and [Bleach](/anime/bleach-thousand-year-blood-war)—aired continuously year-round for over a decade.

In these series, filler came in two main varieties:
- **Standalone comedic or side episodes**: Brief one-off adventures where characters handle lighthearted side missions.
- **Entire multi-cour filler arcs**: Extended multi-episode storylines with new villains, new settings, and self-contained conflicts that could never have lasting consequences on the main narrative because the author was writing something else entirely.

For viewers watching week-to-week back in the 2000s, this was simply part of the viewing experience. But for modern viewers trying to binge a series from start to finish, hitting a 30-episode non-canon arc right in the middle of a war climax can derail your entire interest in the show.

---

## Why Modern Anime Has So Much Less Filler

Over the past decade, the anime industry underwent a massive structural shift toward **seasonal releases**. Instead of committing to air 52 episodes every year indefinitely, studios produce 12 to 24 episode cours with months or even years between seasons.

Shows like [Jujutsu Kaisen](/anime/jujutsu-kaisen) and [Frieren: Beyond Journey''s End](/anime/frieren-beyond-journeys-end) follow this modern model. By taking planned production breaks, the animation team never risks overtaking the original manga, resulting in tightly packed, zero-filler adaptations where every episode matters.

---

## How to Handle Filler as a Viewer

There is no universal rule that says you must skip all filler. Some filler episodes are genuinely funny, expand on underutilized side characters, or give the world breathing room.

However, if your goal is to experience the author''s canonical narrative with natural pacing, having a clear filler guide before you begin is essential. That is why every title on [Chitra Sampada](/) clearly tracks filler percentages and episode-by-episode breakdowns, allowing you to choose whether to watch or skip on your own terms.', '2026-09-10', '2026-09-12', 'published');
INSERT OR REPLACE INTO blog_posts (id, slug, title, excerpt, content, published_date, last_updated, status) VALUES ('post-5-anime-without-filler', '5-anime-masterpieces-with-zero-filler', '5 Anime Masterpieces That Cut the Filler Entirely', 'Five tightly paced, exceptional anime series where every single episode moves the plot forward with zero non-canon detours.', '## No Fluff, No Wasted Time

One of the most common frustrations for anyone picking up a new anime series is the fear of committing dozens of hours to episodes that ultimately lead nowhere. 

If you are looking for storytelling that respects your time from the very first frame to the final credits, here are five masterfully crafted series that contain **zero percent filler**.

---

### 1. Frieren: Beyond Journey''s End (28 Episodes)

[Frieren: Beyond Journey''s End](/anime/frieren-beyond-journeys-end) is an absolute triumph of pacing. Produced by Madhouse, this 28-episode adaptation covers the early arcs of the manga with meticulous care. Every single scene, conversation, and quiet pause serves to deepen the passage of time and the emotional weight of memory. There isn''t a single frame of wasted filler.

### 2. Mob Psycho 100 (37 Episodes Across 3 Seasons)

Studio Bones did something truly rare with [Mob Psycho 100](/anime/mob-psycho-100): they adapted ONE''s entire manga from beginning to conclusion across three distinct seasons without adding superfluous storylines or padding out runtime. Every arc pushes Shigeo Kageyama''s emotional maturity forward, culminating in one of the most satisfying series finales in modern anime.

### 3. Odd Taxi (13 Episodes)

For viewers who prefer mystery and character dialogue over grand magical battles, [Odd Taxi](/anime/odd-taxi) is a masterclass in tight writing. Structured as a tightly wound web of interconnected lives revolving around an aloof walrus taxi driver, every seemingly casual offhand line of dialogue in early episodes pays off in the gripping final episodes.

### 4. Vinland Saga (48 Episodes Across 2 Seasons)

Covering Thorfinn''s harrowing journey from a vengeance-consumed warrior in Season 1 to a broken soul seeking redemption in Season 2, [Vinland Saga](/anime/vinland-saga) is an epic historical drama that never diverts into frivolous filler. Every battle, farm chore, and philosophical conversation is essential to the thematic transformation at the core of the story.

### 5. Jujutsu Kaisen (47 Episodes + Movie)

From its explosive first cour to the relentless chaos of the Shibuya Incident, [Jujutsu Kaisen](/anime/jujutsu-kaisen) moves with breathless momentum. MAPPA adapts Gege Akutami''s dark fantasy manga directly to screen, giving action fans relentless choreography without ever getting bogged down in non-canon side adventures.

---

## The Common Thread

What unites all five of these titles is intentionality. Because none of them were forced to fill an endless weekly broadcast schedule, the directors and storyboard artists could focus entirely on delivering the strongest possible execution of each narrative beat.', '2026-09-14', '2026-09-15', 'published');
INSERT OR REPLACE INTO blog_posts (id, slug, title, excerpt, content, published_date, last_updated, status) VALUES ('post-why-frieren-redefines-fantasy', 'why-frieren-redefines-the-fantasy-journey', 'Why Frieren: Beyond Journey''s End Redefines the Fantasy Journey', 'An exploration of how Frieren flips traditional fantasy tropes by beginning where other epic stories end, focusing on the quiet weight of small moments.', '## The End Is Just the Beginning

Almost every classic fantasy story builds toward a monumental climax: assembling the party, traversing hazardous lands, and finally slaying the demon king or tyrant threatening the realm. We celebrate the triumph, the fireworks go off, and the curtain falls.

[Frieren: Beyond Journey''s End](/anime/frieren-beyond-journeys-end) begins five minutes after that curtain drops.

The Demon King is already dead. The ten-year quest is already over. The townspeople are cheering, and the four heroes sit together on a stone wall watching a meteor shower that occurs only once every half-century. To the human hero Himmel, fifty years is a lifetime; to the elven mage Frieren, it is an eye blink.

> "The journey doesn''t end when the world is saved. For someone who lives thousands of years, the real adventure begins with realizing how much a ten-year detour with mortal friends actually meant."

This simple inversion reframes the entire purpose of fantasy adventure.

---

## Three Storytelling Choices That Set Frieren Apart

Frieren succeeds not by inventing entirely new fantasy creatures or magic systems, but by handling familiar elements with extraordinary maturity and restraint:

- **Decades as a narrative heartbeat**: Time is not treated as a static backdrop. Seasons pass, saplings grow into shade trees, and villages change hands between royal lines. You feel the slow, unstoppable erosion of years, making brief human interactions all the more poignant.
- **Quiet magic over grand spectacle**: While the fight sequences produced by director Keiichiro Saito and studio Madhouse are breathtaking, the spells that matter most are small: a spell that turns sour grapes sweet, a spell that cleans copper statues, or a spell that creates a field of blue flowers.
- **Memory as the true quest objective**: Frieren''s second journey is not motivated by vanquishing a new evil or saving a kingdom. It is motivated by the quiet regret of having not taken the time to truly know the people who loved her when they were alive.

---

## A Gentle Antidote to Hype Fatigue

In an entertainment landscape often dominated by escalating power scales and relentless cliffhangers, Frieren feels like a deep breath of fresh mountain air. It proves that quiet contemplation, warm campfire conversations, and genuine emotional resonance can be just as gripping as any battlefield clash.

If you have not experienced the series yet, you can review our full [Frieren: Beyond Journey''s End Episode Breakdown & Guide](/anime/frieren-beyond-journeys-end) to explore its watch order, characters, and zero-filler pacing.', '2026-09-18', '2026-09-19', 'published');

-- Table: blog_post_anime (2 rows)
INSERT OR REPLACE INTO blog_post_anime (post_id, anime_id) VALUES ('post-5-anime-without-filler', 'frieren');
INSERT OR REPLACE INTO blog_post_anime (post_id, anime_id) VALUES ('post-why-frieren-redefines-fantasy', 'frieren');
