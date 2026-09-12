/**
 * Sample Anime Catalog with Honest Editor Badges, Personal Ratings,
 * Filler Metrics, and Modular Independent Sections.
 */

export const animeList = [
  {
    id: 'naruto-shippuden',
    slug: 'naruto-shippuden',
    title: 'Naruto Shippuden',
    originalTitle: 'NARUTO -ナルト- 疾風伝',
    year: 2007,
    episodes: 500,
    status: 'Finished Airing',
    personalRating: 9.0,
    poster: 'https://image.tmdb.org/t/p/w780/kV27gZqdaUQmFO3m6rEcvEpWzZN.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/vIjyK706i8qfU3556gVvJ8Z8V6X.jpg',
    addedDate: 'Jan 10, 2024',
    lastUpdated: 'Nov 02, 2024',
    honestyStatus: 'watched',
    honestyBadgeText: "I've Watched This",
    fillerPercentage: 41,
    fillerStatus: 'Heavy Filler Warning',
    genres: ['Action', 'Adventure', 'Martial Arts', 'Fantasy'],
    vibes: ['like-naruto', 'op-mc', 'beginners'],
    trending: true,
    synopsis: 'Naruto returns to the Hidden Leaf village after two and a half years of rigorous training with Jiraiya, facing the emerging threat of the shadowy Akatsuki syndicate seeking the Nine-Tailed Fox.',

    // SECTION 1: My Take / Review (Conversational, Personal)
    review: {
      heading: 'A Generational Epic That Truly Demands a Filler Guide',
      score: '9.0',
      paragraphs: [
        'If you cut out the 41% filler bloat, Naruto Shippuden is one of the most emotionally devastating and rewarding fantasy stories ever told. When it hits, nothing else in battle shonen comes close — the fight between Kakashi and Obito in the Kamui dimension is still peak anime choreography, and the emotional payoff of Naruto confronting Pain after the village destruction genuinely made me tear up.',
        'That being said, the pacing in the final war arc can test your patience even when you skip the filler episodes, with constant flashback repetitions mid-fight. But the core story, Yasuharu Takanashi’s unforgettable soundtrack, and the ideological clashes make it an absolute triumph that I find myself rewatching every few years.'
      ]
    },

    // SECTION 2: Watch Order (Full franchise sequence)
    watchOrder: [
      { order: 1, title: 'Naruto (Original)', type: 'TV Series', episodes: '220 Episodes (Skip fillers 136–219)', isCurrent: false, note: 'The foundational original series covering Part 1.' },
      { order: 2, title: 'Naruto Shippuden (Episodes 1–175)', type: 'TV Series', episodes: 'Episodes 1–175', isCurrent: true, note: 'From Kazekage Rescue through the Pain Assault arc.' },
      { order: 3, title: 'The Lost Tower (Movie)', type: 'Movie', episodes: '85 mins', isCurrent: false, note: 'Optional canon-friendly movie best enjoyed after episode 175.' },
      { order: 4, title: 'Naruto Shippuden (Episodes 176–493)', type: 'TV Series', episodes: 'Episodes 176–493', isCurrent: true, note: 'Five Kage Summit and Fourth Great Ninja War.' },
      { order: 5, title: 'The Last: Naruto the Movie', type: 'Movie', episodes: '112 mins', isCurrent: false, note: 'MANDATORY CANON. Watch between Shippuden episodes 493 and 494.' },
      { order: 6, title: 'Naruto Shippuden (Episodes 494–500)', type: 'TV Series', episodes: 'Episodes 494–500', isCurrent: true, note: 'The epilogue wedding arc leading directly into the next generation.' },
      { order: 7, title: 'Boruto: Naruto Next Generations', type: 'TV Series', episodes: '293 Episodes', isCurrent: false, note: 'Sequel series following the offspring of the Hidden Leaf heroes.' }
    ],

    // SECTION 3: Filler List (Numbered Ranges Only)
    fillerList: {
      summary: '205 out of 500 episodes are filler (41%). Skip all filler ranges without missing any core storyline.',
      totalEpisodes: 500,
      fillerEpisodes: 205,
      canonEpisodes: 295,
      ranges: [
        { range: '1–56', type: 'Canon', arc: 'Kazekage Rescue & Tenchi Bridge Arcs' },
        { range: '57–71', type: 'Filler', arc: 'Twelve Guardian Ninja Arc (Skip)' },
        { range: '72–90', type: 'Canon', arc: 'Hidan and Kakuzu Arc' },
        { range: '91–112', type: 'Filler', arc: 'Three-Tails Appearance Arc (Skip)' },
        { range: '113–143', type: 'Canon', arc: "Itachi Pursuit & Master's Prophecy" },
        { range: '144–151', type: 'Filler', arc: 'Six-Tails Unleashed Arc (Skip)' },
        { range: '152–175', type: 'Canon', arc: "Pain's Assault Arc" },
        { range: '176–196', type: 'Filler', arc: 'Past Arc: The Locus of Konoha (Skip)' },
        { range: '197–222', type: 'Canon', arc: 'Five Kage Summit Arc' },
        { range: '223–242', type: 'Filler', arc: 'Paradise Life on a Boat (Skip)' },
        { range: '243–256', type: 'Canon', arc: 'Fourth Shinobi World War: Countdown' },
        { range: '257–260', type: 'Mixed', arc: 'Flashback Recap' },
        { range: '261–270', type: 'Canon', arc: 'War: Confrontation' },
        { range: '271', type: 'Filler', arc: 'Road to Sakura (Skip)' },
        { range: '272–289', type: 'Canon', arc: 'War: Climax Battalions' },
        { range: '290–295', type: 'Filler', arc: 'Power Arc (High Animation, but non-canon)' },
        { range: '296–346', type: 'Canon', arc: 'Reanimated Shinobi & Ten-Tails Revival' },
        { range: '347–361', type: 'Mixed', arc: 'Kakashi ANBU Flashback (Recommended)' },
        { range: '362–375', type: 'Canon', arc: 'Return of the God of Shinobi' },
        { range: '376–377', type: 'Filler', arc: 'Mecha-Naruto Special (Skip)' },
        { range: '378–387', type: 'Canon', arc: 'Infinite Tsukuyomi Countdown' },
        { range: '388–393', type: 'Mixed', arc: 'War Flashbacks' },
        { range: '394–413', type: 'Filler', arc: 'In Naruto’s Footsteps: The Friends’ Paths (Skip)' },
        { range: '414–426', type: 'Canon', arc: 'Eight Inner Gates & Sage of Six Paths' },
        { range: '427–450', type: 'Filler', arc: 'Jiraiya Ninja Scrolls & Dream Worlds (Skip)' },
        { range: '451–458', type: 'Mixed', arc: 'Itachi Shinden: Light and Darkness (Must Watch)' },
        { range: '459–479', type: 'Canon', arc: 'Kaguya Otsutsuki & Naruto vs. Sasuke Finale' },
        { range: '480–483', type: 'Filler', arc: 'Childhood Vignettes (Skip)' },
        { range: '484–500', type: 'Canon', arc: 'Sasuke Shinden, Shikamaru Hiden & Wedding Arc' }
      ]
    },

    // SECTION 4: Characters (Ranked with Categories)
    characters: [
      { rank: 1, name: 'Itachi Uchiha', category: 'Best Written', role: 'Rogue Shinobi • Akatsuki', commentary: 'A tragic martyr whose selfless sacrifice redefines the moral complexity of the entire shinobi system.' },
      { rank: 2, name: 'Kakashi Hatake', category: 'Fan Favorite', role: 'Leader of Team 7 • Sixth Hokage', commentary: 'The emotional anchor of the series, carrying unimaginable loss while remaining a steadfast mentor.' },
      { rank: 3, name: 'Pain (Nagato)', category: 'Best Antagonist', role: 'Leader of Akatsuki • Six Paths of Pain', commentary: 'Delivered the most gripping philosophical confrontation in battle shonen history during the village assault.' },
      { rank: 4, name: 'Madara Uchiha', category: 'Strongest', role: 'Legendary Clan Leader', commentary: 'The gold standard of sheer screen presence and aura; a villain who legitimately lived up to a decade of hype.' },
      { rank: 5, name: 'Might Guy', category: 'Most Underrated', role: 'Taijutsu Master • Hidden Leaf Jonin', commentary: 'Proved that relentless human willpower and physical mastery can stand toe-to-toe with literal gods.' }
    ],

    // SECTION 5: Manga & Light Novel
    source: {
      title: 'Naruto',
      originalTitle: 'NARUTO -ナルト-',
      author: 'Masashi Kishimoto',
      type: 'Manga',
      volumes: '72 Volumes / 700 Chapters',
      publicationStatus: 'Completed (1999 – 2014)',
      adaptationStatus: 'Fully Adapted',
      coverage: 'Anime adapts Chapters 245 through 700. The original pre-Shippuden series adapted Chapters 1 to 244.',
      notes: 'Light novel epilogues (Kakashi Hiden, Shikamaru Hiden, Sasuke Shinden) were adapted into episodes 484–500.'
    },

    // SECTION 6: Power System
    powerSystem: {
      name: 'Chakra & Ninjutsu System',
      paragraphs: [
        'The power system of Naruto is grounded in Chakra — a mystical energy generated by blending physical energy gathered from every cell in the body with spiritual energy gained through study and experience. Once shaped through hand seals, chakra can be manifested into Ninjutsu (elemental attacks), Genjutsu (illusions targeting the nervous system), or Taijutsu (enhanced martial arts).',
        'Advanced practitioners manifest Nature Transformations across five basic elements: Fire, Wind, Lightning, Earth, and Water. The rare fusion of two distinct natures simultaneously gives birth to Kekkei Genkai (bloodline traits such as Ice or Wood Release), while Kekkei Tota combines three elements into devastating Particle Style.',
        'Beyond human chakra lies Senjutsu — drawing natural energy from the surrounding world into the body to enter Sage Mode. The ultimate tier involves Six Paths Chakra and the power of the Tailed Beasts, which grant nearly limitless reality-warping endurance.'
      ]
    },

    // What I Learned (Compact Takeaway)
    lessons: {
      heading: 'Empathy & Consistent Dedication',
      takeaway: 'True strength is not the ability to overpower enemies, but the endurance to understand why they are hurting. Talent is cheap compared to consistent, daily dedication.'
    }
  },

  {
    id: 'frieren',
    slug: 'frieren-beyond-journeys-end',
    title: "Frieren: Beyond Journey's End",
    originalTitle: '葬送のフリーレン (Sousou no Frieren)',
    year: 2023,
    episodes: 28,
    status: 'Finished Airing',
    personalRating: 9.8,
    poster: 'https://image.tmdb.org/t/p/w780/dqZENchTd7lp5zht7BdlqM7RBhD.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/5MAq48e77aP78s2C3sZl8Xm3J8d.jpg',
    addedDate: 'Jan 15, 2024',
    lastUpdated: 'Oct 20, 2024',
    honestyStatus: 'watched',
    honestyBadgeText: "I've Watched This",
    fillerPercentage: 0,
    fillerStatus: 'Zero Filler',
    genres: ['Fantasy', 'Adventure', 'Drama', 'Slice of Life'],
    vibes: ['zero-filler', 'hidden-gems', 'beginners'],
    trending: true,
    synopsis: 'An immortal elf mage and her human companions defeat the Demon King. But after 50 years pass and her former friends begin to pass away, she embarks on a quiet journey to understand the brevity of human life.',

    review: {
      heading: 'The Rare Anime That Transcends Its Medium',
      score: '9.8',
      paragraphs: [
        'Frieren is easily one of the greatest anime I have ever seen. What makes it so special isn’t just the jaw-dropping animation by Madhouse or Evan Call’s majestic orchestral score — it is the quiet, patient maturity in how it approaches grief, memory, and ordinary everyday moments.',
        'It takes a few episodes to settle into its relaxed rhythm, so if you go in expecting non-stop shonen tournament battles, the deliberate pacing might catch you off guard at first. But once the world opens up, every single interaction carries genuine weight. The magic exam arc in the second half manages to be tactically exhilarating while preserving the introspective soul of the story.'
      ]
    },

    watchOrder: [
      { order: 1, title: 'Frieren: Beyond Journey\'s End (Season 1)', type: 'TV Series', episodes: '28 Episodes', isCurrent: true, note: 'Complete Season 1 covering chapters 1 to 60.' }
    ],

    fillerList: {
      summary: '0% Filler. 28 episodes of pure, meticulous manga canon with subtle visual enhancements by Studio Madhouse.',
      totalEpisodes: 28,
      fillerEpisodes: 0,
      canonEpisodes: 28,
      ranges: [
        { range: '1–28', type: 'Canon', arc: 'Prologue through First-Class Mage Exam Arc' }
      ]
    },

    characters: [
      { rank: 1, name: 'Frieren', category: 'Best Written', role: 'Mage • The Slayer', commentary: 'A thousand-year-old elf whose quiet growth and sudden bursts of tactical genius redefine fantasy protagonists.' },
      { rank: 2, name: 'Himmel the Hero', category: 'Fan Favorite', role: 'Leader of the Hero Party', commentary: 'A hero whose vanity is overshadowed only by his profound kindness and enduring influence on everyone he met.' },
      { rank: 3, name: 'Fern', category: 'Strongest Prodigy', role: 'Ordinary Offensive Mage', commentary: 'Master of basic speed casting, proving that perfect fundamentals beat flashy magic every time.' },
      { rank: 4, name: 'Stark', category: 'Most Underrated', role: 'Warrior • Vanguard', commentary: 'Terrified before every fight, yet stands firm when it matters most.' }
    ],

    source: {
      title: "Frieren: Beyond Journey's End",
      originalTitle: '葬送のフリーレン',
      author: 'Kanehito Yamada (Story), Tsukasa Abe (Art)',
      type: 'Manga',
      volumes: '13+ Volumes (Ongoing)',
      publicationStatus: 'Ongoing',
      adaptationStatus: 'Ongoing Adaptation',
      coverage: 'Season 1 adapts Chapters 1 through 60 (up to the conclusion of the First-Class Mage Exam).',
      notes: 'To continue where the anime left off, start reading at Chapter 61 (Volume 7).'
    },

    powerSystem: {
      name: 'Mana Visualization & Classical Spellcraft',
      paragraphs: [
        'Magic in Frieren operates on visualization: a mage cannot manifest a spell unless they can clearly and concretely picture it in their mind. What cannot be visualized is strictly impossible.',
        'Mana control is vital. Skilled mages suppress their leaking mana to fool demon predators into underestimating their lethal range. Combat spells are fast, direct, and lethal, where a single second of distraction results in defeat.',
        'Folk magic (cleaning clothes, turning sweet grapes sour) exists alongside combat spells, representing the everyday beauty of living in a peaceful world.'
      ]
    },

    // What I Learned (Compact Takeaway)
    lessons: {
      heading: 'The Precious Value of Ordinary Time',
      takeaway: 'We live as if we have an infinite supply of tomorrows. Kindness, shared memories, and small everyday moments are the only things that truly survive us.'
    }
  },

  // TEST CASE 2: Missing several sections (No power system, no manga/LN source, no reviews/lessons, NO personal rating)
  {
    id: 'odd-taxi',
    slug: 'odd-taxi',
    title: 'Odd Taxi',
    originalTitle: 'オッドタクシー',
    year: 2021,
    episodes: 13,
    status: 'Finished Airing',
    poster: 'https://image.tmdb.org/t/p/w780/nQhH6eUaT1e1L0aL0s4y7w6v8Z5.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/4qW8M2vT0yQ1wP3rY7uK9zO2wN4.jpg',
    addedDate: 'Feb 12, 2024',
    lastUpdated: 'Aug 14, 2024',
    honestyStatus: 'watched',
    honestyBadgeText: "I've Watched This",
    fillerPercentage: 0,
    fillerStatus: 'Zero Filler',
    genres: ['Mystery', 'Psychological', 'Drama', 'Thriller'],
    vibes: ['hidden-gems', 'zero-filler'],
    trending: false,
    synopsis: 'An eccentric walrus taxi driver navigates Tokyo nights, carrying passengers whose seemingly unrelated conversations slowly connect to a missing high school girl.',

    watchOrder: [
      { order: 1, title: 'Odd Taxi (TV Series)', type: 'TV Series', episodes: '13 Episodes', isCurrent: true, note: 'The complete airtight mystery series.' },
      { order: 2, title: 'Odd Taxi: In the Woods', type: 'Movie', episodes: '128 mins', isCurrent: false, note: 'Recap film with a newly animated epilogue scene.' }
    ],

    fillerList: {
      summary: '100% Original Anime. 13 episodes of interconnected clues with zero filler.',
      totalEpisodes: 13,
      fillerEpisodes: 0,
      canonEpisodes: 13,
      ranges: [
        { range: '1–13', type: 'Canon', arc: 'The Full Interconnected Tokyo Case' }
      ]
    },

    characters: [
      { rank: 1, name: 'Hiroshi Odokawa', category: 'Best Written', role: 'Walrus Taxi Driver', commentary: 'A cynical, deadpan driver with exceptional observational memory and a hidden past.' },
      { rank: 2, name: 'Dobu', category: 'Fan Favorite', role: 'Yakuza Enforcer', commentary: 'Intelligent, street-smart mobster who trades razor-sharp dialogue with Odokawa.' },
      { rank: 3, name: 'Yano', category: 'Most Underrated', role: 'Rap-Speaking Gangster', commentary: 'Rhymes every line with rhythmic menace and erratic charisma.' }
    ]
  },

  // TEST CASE 3: "My Take" filled in but NO "What I Learned"
  {
    id: 'jujutsu-kaisen',
    slug: 'jujutsu-kaisen',
    title: 'Jujutsu Kaisen',
    originalTitle: '呪術廻戦',
    year: 2020,
    episodes: 47,
    status: 'Ongoing',
    personalRating: 9.2,
    poster: 'https://image.tmdb.org/t/p/w780/hFWP5HkbVEe40hrXgtCe5xUCvM7.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg',
    addedDate: 'Jan 18, 2024',
    lastUpdated: 'Nov 01, 2024',
    honestyStatus: 'watched',
    honestyBadgeText: "I've Watched This",
    fillerPercentage: 0,
    fillerStatus: 'Zero Filler',
    genres: ['Action', 'Dark Fantasy', 'Supernatural'],
    vibes: ['op-mc', 'like-naruto', 'zero-filler', 'beginners'],
    trending: true,
    synopsis: 'A high schooler with astonishing physical prowess swallows a cursed talisman to save a friend, becoming host to the Legendary King of Curses Ryomen Sukuna.',

    review: {
      heading: 'Pure Kinetic Adrenaline with Unforgiving Stakes',
      score: '9.2',
      paragraphs: [
        'MAPPA went completely feral on the animation in Season 2. The Shibuya Incident is a non-stop gauntlet where every episode feels like a season finale, and the series is completely unafraid to kill off beloved characters or put them through absolute psychological misery.',
        'My only real critique is that the pacing is so relentless that there is almost zero downtime for quiet character banter once the action kicks off. But as far as raw sakuga combat, inventive power systems, and high emotional stakes go, it is modern battle shonen operating at the absolute highest level.'
      ]
    },

    watchOrder: [
      { order: 1, title: 'Jujutsu Kaisen Season 1', type: 'TV Series', episodes: '24 Episodes', isCurrent: false, note: 'Introduces Yuji Itadori and Jujutsu High fundamentals.' },
      { order: 2, title: 'Jujutsu Kaisen 0 (Movie)', type: 'Movie', episodes: '105 mins', isCurrent: false, note: 'MANDATORY PREQUEL. Sets up Suguru Geto and Yuta Okkotsu before Season 2.' },
      { order: 3, title: 'Jujutsu Kaisen Season 2 (Hidden Inventory & Shibuya Incident)', type: 'TV Series', episodes: '23 Episodes', isCurrent: true, note: 'Gojo’s past followed by the catastrophic Shibuya Incident.' }
    ],

    fillerList: {
      summary: 'Zero filler. The movie is essential canon and should be watched between Season 1 and Season 2.',
      totalEpisodes: 47,
      fillerEpisodes: 0,
      canonEpisodes: 47,
      ranges: [
        { range: '1–24', type: 'Canon', arc: 'Fearsome Womb through Death Painting Arc' },
        { range: '25–29', type: 'Canon', arc: 'Hidden Inventory / Premature Death Arc' },
        { range: '30–47', type: 'Canon', arc: 'Shibuya Incident Arc' }
      ]
    },

    characters: [
      { rank: 1, name: 'Satoru Gojo', category: 'Strongest', role: 'Special Grade Sorcerer', commentary: 'The unrivaled pinnacle of the modern jujutsu world whose birth shifted the balance of existence.' },
      { rank: 2, name: 'Toji Fushiguro', category: 'Fan Favorite', role: 'The Sorcerer Killer', commentary: 'Zero cursed energy, pure physical savagery and tactical brilliance.' },
      { rank: 3, name: 'Ryomen Sukuna', category: 'Best Antagonist', role: 'King of Curses', commentary: 'An unrelenting force of calamity who acts entirely on his own chaotic whims.' }
    ],

    source: {
      title: 'Jujutsu Kaisen',
      originalTitle: '呪術廻戦',
      author: 'Gege Akutami',
      type: 'Manga',
      volumes: '28+ Volumes (Completed in Manga)',
      publicationStatus: 'Completed (2018 – 2024)',
      adaptationStatus: 'Ongoing Adaptation',
      coverage: 'Season 2 finishes at Chapter 137. The manga concludes at Chapter 271.',
      notes: 'To continue after Shibuya, start reading at Chapter 138 (Culling Game Arc).'
    },

    powerSystem: {
      name: 'Cursed Energy & Domain Expansion',
      paragraphs: [
        'Cursed Energy leaks from the negative emotions of humans. Sorcerers channel this raw energy into refined Cursed Techniques imprinted into their bodies from birth.',
        'The pinnacle of jujutsu is Domain Expansion: creating a separate metaphysical space imbued with the user’s innate technique where all attacks are guaranteed to hit.',
        'Binding Vows allow sorcerers to artificially create self-imposed restrictions (such as explaining their technique to the opponent) in exchange for exponential increases in output.'
      ]
    }
  },

  // TEST CASE 4: "What I Learned" filled in but NO "My Take"
  {
    id: 'vinland-saga',
    slug: 'vinland-saga',
    title: 'Vinland Saga',
    originalTitle: 'ヴィンランド・サガ',
    year: 2019,
    episodes: 48,
    status: 'Finished Airing',
    personalRating: 9.5,
    poster: 'https://image.tmdb.org/t/p/w780/4N3kX2V6wD0sI7QvR0vGj4lM9W2.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/5MAq48e77aP78s2C3sZl8Xm3J8d.jpg',
    addedDate: 'Jan 22, 2024',
    lastUpdated: 'Sep 30, 2024',
    honestyStatus: 'watched',
    honestyBadgeText: "I've Watched This",
    fillerPercentage: 2,
    fillerStatus: 'Zero Filler',
    genres: ['Action', 'Historical', 'Drama', 'Psychological'],
    vibes: ['zero-filler', 'hidden-gems', 'beginners'],
    trending: true,
    synopsis: 'Raised by the Vikings who murdered his father, young Thorfinn dedicates his life to dueling their leader Askeladd in an insatiable quest for revenge.',

    watchOrder: [
      { order: 1, title: 'Vinland Saga Season 1 (WIT Studio)', type: 'TV Series', episodes: '24 Episodes', isCurrent: false, note: 'The War/Prologue Arc focusing on Askeladd and young Thorfinn.' },
      { order: 2, title: 'Vinland Saga Season 2 (MAPPA)', type: 'TV Series', episodes: '24 Episodes', isCurrent: true, note: 'The Slave / Ketil’s Farm Arc, a deep philosophical turning point.' }
    ],

    fillerList: {
      summary: '100% Canon. Season 1 has two author-approved anime-original prologue episodes (episodes 5 & 6) that enrich Thorfinn’s childhood.',
      totalEpisodes: 48,
      fillerEpisodes: 0,
      canonEpisodes: 48,
      ranges: [
        { range: '1–24', type: 'Canon', arc: 'Prologue / War Arc' },
        { range: '25–48', type: 'Canon', arc: 'Slave / Farmland Arc' }
      ]
    },

    characters: [
      { rank: 1, name: 'Askeladd', category: 'Best Written', role: 'Viking Band Commander', commentary: 'One of the greatest anti-heroes in modern media; brilliant, ruthless, yet secretly harboring profound idealism.' },
      { rank: 2, name: 'Thorfinn Karlsefni', category: 'Most Evolved', role: 'Warrior turned Pacifist', commentary: 'Undergoes one of the most agonizing and earned redemptive transformations ever animated.' },
      { rank: 3, name: 'Thors the Troll', category: 'Strongest Moral Core', role: 'Legendary Jomsviking', commentary: 'A true warrior needs no sword. His creed echoes across the entire narrative.' }
    ],

    source: {
      title: 'Vinland Saga',
      originalTitle: 'ヴィンランド・サガ',
      author: 'Makoto Yukimura',
      type: 'Manga',
      volumes: '28+ Volumes (Ongoing / Near Climax)',
      publicationStatus: 'Ongoing',
      adaptationStatus: 'Ongoing Adaptation',
      coverage: 'Anime adapts Chapters 1 through 100 (Volumes 1–14).',
      notes: 'To continue reading after Season 2, start at Chapter 101 (Eastern Expedition Arc).'
    },

    // What I Learned (Compact Takeaway)
    lessons: {
      heading: 'True Strength & Empathy',
      takeaway: 'Revenge leaves you empty. True strength isn’t holding a sharper blade — it is having the courage to refuse violence and choose empathy even when striking is easiest.'
    }
  },

  {
    id: 'solo-leveling',
    slug: 'solo-leveling',
    title: 'Solo Leveling',
    originalTitle: '나 혼자만 레벨업 (Ore dake Level Up na Ken)',
    year: 2024,
    episodes: 25,
    status: 'Ongoing',
    personalRating: 8.8,
    poster: 'https://image.tmdb.org/t/p/w780/geCRueV3ElhRTr0xtJuPxJ8HGQH.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/2rmK7mnchsl935x82Rp8ea7LZkd.jpg',
    addedDate: 'Jan 25, 2024',
    lastUpdated: 'Nov 04, 2024',
    honestyStatus: 'watched',
    honestyBadgeText: "I've Watched This",
    fillerPercentage: 0,
    fillerStatus: 'Zero Filler',
    genres: ['Action', 'Fantasy', 'Supernatural'],
    vibes: ['op-mc', 'beginners'],
    trending: true,
    synopsis: 'Known as the weakest hunter of all mankind, Sung Jinwoo is trapped in a deadly double dungeon. Surviving against all odds, a mysterious quest log grants him the ability to level up infinitely.',

    review: {
      heading: 'The Gold Standard of Power Fantasy Dopamine',
      score: '8.8',
      paragraphs: [
        'Solo Leveling does not pretend to be a deep philosophical meditation — it is pure, unadulterated power fantasy progression, and it executes that formula better than almost anything else. Sung Jinwoo’s rise from bottom-tier fodder to commanding legions of shadow soldiers is accompanied by Hiroyuki Sawano’s pulse-pounding soundtrack.',
        'The supporting cast definitely takes a back seat as Jinwoo scales up, but if you want crisp fight animation, crunchy impact sounds, and pure hype payoffs, this delivers in spades.'
      ]
    },

    watchOrder: [
      { order: 1, title: 'Solo Leveling Season 1', type: 'TV Series', episodes: '12 Episodes', isCurrent: false, note: 'Covers D-Rank dungeon to the Job Change quest.' },
      { order: 2, title: 'Solo Leveling: ReAwakening', type: 'Movie / Special', episodes: '115 mins', isCurrent: false, note: 'Recap of S1 + early preview of S2 episodes.' },
      { order: 3, title: 'Solo Leveling Season 2: Arise from the Shadow', type: 'TV Series', episodes: '13 Episodes', isCurrent: true, note: 'Red Gate and Demon Castle arcs.' }
    ],

    fillerList: {
      summary: 'Adapted strictly from manhwa canon. Episode 7.5 is a recap episode and can be skipped.',
      totalEpisodes: 25,
      fillerEpisodes: 0,
      canonEpisodes: 25,
      ranges: [
        { range: '1–7', type: 'Canon', arc: 'D-Rank Dungeon & Kasaka Arc' },
        { range: '7.5', type: 'Filler', arc: 'Mid-Season Recap (Skip)' },
        { range: '8–12', type: 'Canon', arc: 'Job Change & Necromancer Arc' },
        { range: '13–25', type: 'Canon', arc: 'Red Gate & Jeju Island Build-up' }
      ]
    },

    characters: [
      { rank: 1, name: 'Sung Jinwoo', category: 'Strongest', role: 'Shadow Monarch', commentary: 'Starts as an E-rank laughingstock and rises to command legions of undead shadows.' },
      { rank: 2, name: 'Igris', category: 'Fan Favorite', role: 'Blood-Red Commander', commentary: 'The loyal knight shadow whose chivalrous demeanor steals every fight scene.' },
      { rank: 3, name: 'Cha Hae-In', category: 'Best Written', role: 'S-Rank Hunter', commentary: 'One of the few top-tier hunters with genuine tactical instinct.' }
    ],

    source: {
      title: 'Solo Leveling (Only I Level Up)',
      originalTitle: '나 혼자만 level up',
      author: 'Chugong (Novel), DUBU/REDICE (Webtoon Art)',
      type: 'Webtoon / Manhwa',
      volumes: '179 Chapters (Completed)',
      publicationStatus: 'Completed (2018 – 2021)',
      adaptationStatus: 'Ongoing Adaptation',
      coverage: 'Season 1 covers webtoon Chapters 1 to 45.',
      notes: 'Webtoon is fully completed and available in full-color format.'
    },

    powerSystem: {
      name: 'Hunter Awakening & The System',
      paragraphs: [
        'In the world of Solo Leveling, humans undergo an "Awakening" that grants them fixed magical ranks from E to S. Ranks are strictly permanent and cannot be increased through training.',
        'Sung Jinwoo is the sole exception: the "System" turns his reality into an RPG interface with daily quests, stat points, inventory storage, and skill trees.',
        'His primary class ability, Shadow Extraction, extracts souls from fallen enemies to forge an immortal army of loyal shadows.'
      ]
    }
  },

  {
    id: 'dangers-in-my-heart',
    slug: 'the-dangers-in-my-heart',
    title: 'The Dangers in My Heart',
    originalTitle: '僕の心のヤバイやつ (Boku no Kokoro no Yabai Yatsu)',
    year: 2023,
    episodes: 25,
    status: 'Finished Airing',
    personalRating: 9.1,
    poster: 'https://image.tmdb.org/t/p/w780/b5rX1b9dC1E8OQ102F3J2lT2YtN.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/pBqg8G1f0M3Vw6c3qJ1iK7y5W4D.jpg',
    addedDate: 'Feb 01, 2024',
    lastUpdated: 'Oct 15, 2024',
    honestyStatus: 'watched',
    honestyBadgeText: "I've Watched This",
    fillerPercentage: 0,
    fillerStatus: 'Zero Filler',
    genres: ['Romance', 'Comedy', 'Slice of Life'],
    vibes: ['slow-burn-romance', 'hidden-gems'],
    trending: true,
    synopsis: 'Kyotaro Ichikawa, an antisocial middle schooler with bizarre murder fantasies, discovers that the popular school idol Anna Yamada is surprisingly quirky, hungry, and oblivious.',

    watchOrder: [
      { order: 1, title: 'The Dangers in My Heart Season 1', type: 'TV Series', episodes: '12 Episodes', isCurrent: false, note: 'Covers the early library encounters and growing mutual trust.' },
      { order: 2, title: 'The Dangers in My Heart Season 2', type: 'TV Series', episodes: '13 Episodes', isCurrent: true, note: 'School trip and historic confession payoffs.' }
    ],

    fillerList: {
      summary: 'Pure manga adaptation with zero filler.',
      totalEpisodes: 25,
      fillerEpisodes: 0,
      canonEpisodes: 25,
      ranges: [
        { range: '1–25', type: 'Canon', arc: 'Manga Volumes 1 through 8' }
      ]
    },

    characters: [
      { rank: 1, name: 'Anna Yamada', category: 'Fan Favorite', role: 'Junior Model & Class Idol', commentary: 'Endearingly dorky, expressive, and direct in her affections.' },
      { rank: 2, name: 'Kyotaro Ichikawa', category: 'Best Written', role: 'Middle School Protagonist', commentary: 'Transitions from insecure teenage angst to a caring, self-aware partner.' }
    ],

    source: {
      title: 'The Dangers in My Heart',
      originalTitle: '僕の心のヤバイやつ',
      author: 'Norio Sakurai',
      type: 'Manga',
      volumes: '10+ Volumes (Ongoing)',
      publicationStatus: 'Ongoing',
      adaptationStatus: 'Ongoing Adaptation',
      coverage: 'Seasons 1 & 2 adapt Chapters 1 through 113 (Volume 8).',
      notes: 'Read from Chapter 114 to continue the story in high school.'
    },

    // What I Learned (Compact Takeaway)
    lessons: {
      heading: 'Vulnerability Over Defensive Armor',
      takeaway: 'Vulnerability is not weakness. Real connection only begins when we drop the defensive armor and risk looking foolish in front of someone we care about.'
    }
  },

  {
    id: 'apothecary-diaries',
    slug: 'the-apothecary-diaries',
    title: 'The Apothecary Diaries',
    originalTitle: '薬屋のひとりごと (Kusuriya no Hitorigoto)',
    year: 2023,
    episodes: 24,
    status: 'Ongoing',
    personalRating: 9.0,
    poster: 'https://image.tmdb.org/t/p/w780/gL0s3k3zOQ7y9wP4rW6V8Y0Z2N2.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/8wW1qP8wW2yT8wM9aY7uO2yM4n8.jpg',
    addedDate: 'Feb 15, 2024',
    lastUpdated: 'Nov 03, 2024',
    honestyStatus: 'watched',
    honestyBadgeText: "I've Watched This",
    fillerPercentage: 0,
    fillerStatus: 'Zero Filler',
    genres: ['Mystery', 'Historical', 'Drama'],
    vibes: ['hidden-gems', 'slow-burn-romance', 'zero-filler'],
    trending: true,
    synopsis: 'Kidnapped and sold into the imperial palace, an eccentric apothecary with a taste for poisons solves medical mysteries that threaten royal consorts.',

    review: {
      heading: 'Witty, Beautifully Crafted Palace Intrigue',
      score: '9.0',
      paragraphs: [
        'Maomao is instantly one of my favorite female protagonists in recent memory. She is unapologetically cynical, pragmatic, and obsessed with poison and medicinal herbs, which makes watching her untangle imperial palace conspiracies endlessly entertaining.',
        'Some of the court politics and clan rivalries can get a bit dense in the middle episodes, but the gorgeous art direction and the hilarious dynamic between Maomao and Jinshi keep the momentum fresh throughout.'
      ]
    },

    watchOrder: [
      { order: 1, title: 'The Apothecary Diaries Season 1', type: 'TV Series', episodes: '24 Episodes', isCurrent: true, note: 'Covers Light Novel Volumes 1 and 2.' }
    ],

    fillerList: {
      summary: '100% canon adaptation of the light novel mysteries.',
      totalEpisodes: 24,
      fillerEpisodes: 0,
      canonEpisodes: 24,
      ranges: [
        { range: '1–24', type: 'Canon', arc: 'Imperial Rear Palace Mysteries' }
      ]
    },

    characters: [
      { rank: 1, name: 'Maomao', category: 'Best Written', role: 'Palace Poison Tester & Apothecary', commentary: 'A pragmatic, brilliant heroine who cares more about rare herbs than royal prestige.' },
      { rank: 2, name: 'Jinshi', category: 'Fan Favorite', role: 'Palace Eunuch / Imperial Administrator', commentary: 'Charming, manipulative, yet perpetually flustered by Maomao’s total indifference to his looks.' }
    ],

    source: {
      title: 'The Apothecary Diaries',
      originalTitle: '薬屋のひとりごと',
      author: 'Natsu Hyuuga (Novel), Nekokurage (Manga)',
      type: 'Light Novel & Manga',
      volumes: '15+ Light Novel Volumes',
      publicationStatus: 'Ongoing',
      adaptationStatus: 'Ongoing Adaptation',
      coverage: 'Season 1 covers Light Novel Volumes 1 & 2 (Manga Chapters 1–40).',
      notes: 'Season 2 begins at Light Novel Volume 3.'
    }
  },

  {
    id: 'mob-psycho-100',
    slug: 'mob-psycho-100',
    title: 'Mob Psycho 100',
    originalTitle: 'モブサイコ100',
    year: 2016,
    episodes: 37,
    status: 'Finished Airing',
    personalRating: 9.7,
    poster: 'https://image.tmdb.org/t/p/w780/29A2n2M8G6xY5y1Q3rG0sK7w8p9.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/3wY8M2V8kQ9y7wW6uY4pZ1yK0m5.jpg',
    addedDate: 'Jan 05, 2024',
    lastUpdated: 'Aug 25, 2024',
    honestyStatus: 'watched',
    honestyBadgeText: "I've Watched This",
    fillerPercentage: 0,
    fillerStatus: 'Zero Filler',
    genres: ['Action', 'Comedy', 'Supernatural', 'Slice of Life'],
    vibes: ['op-mc', 'zero-filler', 'beginners'],
    trending: false,
    synopsis: 'An eighth-grader with godlike psychic abilities suppresses his emotions to prevent psychic explosions, seeking only to improve his physical fitness to impress his middle-school crush.',

    review: {
      heading: 'One of the Rare Complete, Flawless Three-Season Runs',
      score: '9.7',
      paragraphs: [
        'Mob Psycho 100 has everything: mind-bending sakuga animation from Studio BONES, genuine belly-laugh humor, and arguably the most wholesome emotional core in all of anime. Reigen Arataka could have easily been an annoying gimmick character, but he turns out to be one of the best mentors ever written.',
        'All three seasons tell a complete, tightly paced story with zero wasted episodes, ending on the rare, coveted perfect series finale.'
      ]
    },

    watchOrder: [
      { order: 1, title: 'Mob Psycho 100 (Season 1)', type: 'TV Series', episodes: '12 Episodes', isCurrent: false, note: 'Introduces Mob, Reigen, and Claw 7th Division.' },
      { order: 2, title: 'Mob Psycho 100 II (Season 2)', type: 'TV Series', episodes: '13 Episodes', isCurrent: false, note: 'Mogami Arc and Claw World Domination Arc.' },
      { order: 3, title: 'Mob Psycho 100 III (Season 3)', type: 'TV Series', episodes: '12 Episodes', isCurrent: true, note: 'Divine Tree and Confession Arc (Series Finale).' }
    ],

    fillerList: {
      summary: '100% Manga Canon. Adapted completely across 3 immaculate seasons by Studio BONES.',
      totalEpisodes: 37,
      fillerEpisodes: 0,
      canonEpisodes: 37,
      ranges: [
        { range: '1–37', type: 'Canon', arc: 'Full Complete Manga Adaptation' }
      ]
    },

    characters: [
      { rank: 1, name: 'Reigen Arataka', category: 'Best Written', role: 'Spirits and Such Consultation', commentary: 'A con-man with zero spiritual power who is nonetheless the greatest moral guide a child could have.' },
      { rank: 2, name: 'Shigeo Kageyama (Mob)', category: 'Most Wholesome', role: 'Psychic Middle Schooler', commentary: 'Possesses godlike power, yet values kindness, running club sweat, and friendship above all else.' }
    ],

    source: {
      title: 'Mob Psycho 100',
      originalTitle: 'モブサイコ100',
      author: 'ONE',
      type: 'Manga',
      volumes: '16 Volumes / 101 Chapters',
      publicationStatus: 'Completed (2012 – 2017)',
      adaptationStatus: 'Fully Adapted',
      coverage: 'The anime adapts the entire manga from Chapter 1 to 101 with complete closure.',
      notes: 'No manga reading required after finishing Season 3.'
    },

    powerSystem: {
      name: 'Esper Telekinesis & Emotional Threshold (100%)',
      paragraphs: [
        'Psychic power in Mob Psycho 100 is fueled by suppressed human emotions: Anger, Sadness, Gratitude, and Courage.',
        'When Mob reaches 100% emotional intensity, his psychic seal bursts, unleashing city-level telekinetic storms. If knocked unconscious, his subconscious "???%" mode emerges with cataclysmic scale.'
      ]
    },

    // What I Learned (Compact Takeaway)
    lessons: {
      heading: 'Humility & Working on What’s Difficult',
      takeaway: 'Having a special talent doesn’t make you better than anyone else. True self-esteem comes from working hard on the things that are genuinely difficult for you.'
    }
  },

  {
    id: 'bleach-tybw',
    slug: 'bleach-thousand-year-blood-war',
    title: 'Bleach: Thousand-Year Blood War',
    originalTitle: 'BLEACH 千年血戦篇',
    year: 2022,
    episodes: 39,
    status: 'Ongoing',
    poster: 'https://image.tmdb.org/t/p/w780/b5rX1b9dC1E8OQ102F3J2lT2YtN.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/vIjyK706i8qfU3556gVvJ8Z8V6X.jpg',
    addedDate: 'Jan 28, 2024',
    lastUpdated: 'Nov 02, 2024',
    honestyStatus: 'watchlist',
    honestyBadgeText: 'On My Watchlist',
    fillerPercentage: 0,
    fillerStatus: 'Zero Filler',
    genres: ['Action', 'Supernatural', 'Adventure'],
    vibes: ['op-mc', 'like-naruto'],
    trending: true,
    synopsis: 'Peace is shattered when an alarm sounds through the Soul Society. The Quincy King Yhwach emerges from the shadows to wage total war against the Soul Reapers.',

    watchOrder: [
      { order: 1, title: 'Bleach: Thousand-Year Blood War (Cour 1: The Blood Warfare)', type: 'TV Series', episodes: '13 Episodes', isCurrent: false, note: 'Quincy invasion of Soul Society.' },
      { order: 2, title: 'Cour 2: The Separation', type: 'TV Series', episodes: '13 Episodes', isCurrent: false, note: 'Second invasion with expanded anime-original Bankai.' },
      { order: 3, title: 'Cour 3: The Conflict', type: 'TV Series', episodes: '13 Episodes', isCurrent: true, note: 'Royal Palace invasion and Squad Zero battle.' }
    ],

    fillerList: {
      summary: 'Zero filler. Author Tite Kubo actively expanded fight scenes exclusively for this adaptation.',
      totalEpisodes: 39,
      fillerEpisodes: 0,
      canonEpisodes: 39,
      ranges: [
        { range: '1–39', type: 'Canon', arc: 'Manga Chapters 480–686 with expanded scenes' }
      ]
    },

    characters: [
      { rank: 1, name: 'Ichigo Kurosaki', category: 'Strongest', role: 'Substitute Soul Reaper', commentary: 'Unlocks the true dual-blade manifestation of his Soul Reaper and Quincy ancestry.' },
      { rank: 2, name: 'Yhwach', category: 'Best Antagonist', role: 'Father of the Quincy', commentary: 'Wields "The Almighty" to perceive and rewrite future timelines.' }
    ],

    source: {
      title: 'Bleach',
      originalTitle: 'BLEACH',
      author: 'Tite Kubo',
      type: 'Manga',
      volumes: '74 Volumes / 686 Chapters',
      publicationStatus: 'Completed',
      adaptationStatus: 'Ongoing Final Arc Adaptation',
      coverage: 'Adapts the final manga arc Chapters 480 to 686 across 4 cours.',
      notes: 'Includes brand new fight choreography not present in the original manga.'
    },

    powerSystem: {
      name: 'Reiryoku, Zanpakuto & Bankai',
      paragraphs: [
        'Soul Reapers channel spiritual pressure (Reiatsu) through their Zanpakuto, calling upon Shikai (initial release) and Bankai (ultimate manifestation).',
        'Quincies manipulate reishi in the environment and utilize Vollständig to manifest divine angelic combat forms.'
      ]
    }
  },

  {
    id: 'kaiju-no-8',
    slug: 'kaiju-no-8',
    title: 'Kaiju No. 8',
    originalTitle: '怪獣8号 (Kaijuu 8-gou)',
    year: 2024,
    episodes: 12,
    status: 'Ongoing',
    poster: 'https://image.tmdb.org/t/p/w780/8wW1qP8wW2yT8wM9aY7uO2yM4n8.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/5MAq48e77aP78s2C3sZl8Xm3J8d.jpg',
    addedDate: 'Feb 20, 2024',
    lastUpdated: 'Jul 15, 2024',
    honestyStatus: 'watchlist',
    honestyBadgeText: 'On My Watchlist',
    fillerPercentage: 0,
    fillerStatus: 'Zero Filler',
    genres: ['Action', 'Sci-Fi', 'Military'],
    vibes: ['op-mc', 'beginners', 'like-naruto'],
    trending: false,
    synopsis: 'A 32-year-old kaiju corpse cleaner gets infected by a tiny monster, gaining the ability to transform into the lethal humanoid Kaiju No. 8.',

    watchOrder: [
      { order: 1, title: 'Kaiju No. 8 Season 1', type: 'TV Series', episodes: '12 Episodes', isCurrent: true, note: 'Covers the Defense Force Exam and Tachikawa Base raid.' }
    ],

    fillerList: {
      summary: '100% Manga Canon. Faithfully adapts manga chapters 1 to 38.',
      totalEpisodes: 12,
      fillerEpisodes: 0,
      canonEpisodes: 12,
      ranges: [
        { range: '1–12', type: 'Canon', arc: 'Manga Volumes 1 through 5' }
      ]
    },

    characters: [
      { rank: 1, name: 'Kafka Hibino / Kaiju No. 8', category: 'Best Written', role: 'Defense Force Cadet', commentary: 'A refreshing 32-year-old working-class protagonist refusing to give up on his childhood promise.' },
      { rank: 2, name: 'Mina Ashiro', category: 'Strongest', role: 'Captain of the Third Division', commentary: 'Heavy artillery marksman capable of single-handedly obliterating giant Honju kaiju.' }
    ],

    source: {
      title: 'Kaiju No. 8',
      originalTitle: '怪獣8号',
      author: 'Naoya Matsumoto',
      type: 'Manga',
      volumes: '13+ Volumes (Ongoing)',
      publicationStatus: 'Ongoing',
      adaptationStatus: 'Ongoing Adaptation',
      coverage: 'Season 1 adapts Chapters 1 through 38.',
      notes: 'Read from Chapter 39 to continue the story in the manga.'
    }
  },

  {
    id: 'kaguya-sama',
    slug: 'kaguya-sama-love-is-war',
    title: 'Kaguya-sama: Love Is War',
    originalTitle: 'かぐや様は告らせたい ～天才たちの恋愛頭脳戦～',
    year: 2019,
    episodes: 37,
    status: 'Finished Airing',
    personalRating: 9.4,
    poster: 'https://image.tmdb.org/t/p/w780/dqZENchTd7lp5zht7BdlqM7RBhD.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/pBqg8G1f0M3Vw6c3qJ1iK7y5W4D.jpg',
    addedDate: 'Jan 12, 2024',
    lastUpdated: 'Sep 10, 2024',
    honestyStatus: 'watched',
    honestyBadgeText: "I've Watched This",
    fillerPercentage: 0,
    fillerStatus: 'Zero Filler',
    genres: ['Romance', 'Comedy', 'Psychological'],
    vibes: ['slow-burn-romance', 'beginners'],
    trending: false,
    synopsis: 'Two genius student council leaders are too proud to confess their feelings, turning daily high school interactions into elaborate psychological warfare to force the other to confess first.',

    review: {
      heading: 'Peak Romantic Comedy with Genuinely Historic Payoffs',
      score: '9.4',
      paragraphs: [
        'Most rom-com anime suffer from endless status quo stagnation, but Kaguya-sama actually evolves. The psychological mind games start as brilliant slapstick comedy, and over three seasons develop into genuine, mature emotional vulnerability.',
        'The dual confession climax in Season 3 Ultra Romantic is one of the most satisfying romantic payoffs I have ever watched. The narrator’s comedic delivery alone makes this an essential watch.'
      ]
    },

    watchOrder: [
      { order: 1, title: 'Kaguya-sama: Love Is War (Season 1)', type: 'TV Series', episodes: '12 Episodes', isCurrent: false, note: 'Introduces the student council mind games and fireworks finale.' },
      { order: 2, title: 'Kaguya-sama: Love Is War? (Season 2)', type: 'TV Series', episodes: '12 Episodes', isCurrent: false, note: 'Student council election and Ishigami sports festival arc.' },
      { order: 3, title: 'Kaguya-sama: Ultra Romantic (Season 3)', type: 'TV Series', episodes: '13 Episodes', isCurrent: false, note: 'The legendary Dual Confession and cultural festival climax.' },
      { order: 4, title: 'The First Kiss That Never Ends', type: 'Movie / Special', episodes: '4 Episodes (90 mins)', isCurrent: true, note: 'Crucial canon continuation exploring emotional intimacy.' }
    ],

    fillerList: {
      summary: '100% Manga Canon. Pure chapter-by-chapter comedy adaptation by A-1 Pictures.',
      totalEpisodes: 37,
      fillerEpisodes: 0,
      canonEpisodes: 37,
      ranges: [
        { range: '1–37', type: 'Canon', arc: 'Manga Chapters 1 through 151' }
      ]
    },

    characters: [
      { rank: 1, name: 'Yu Ishigami', category: 'Best Written', role: 'Student Council Treasurer', commentary: 'Grows from cynical loner into the most beloved character with one of the best redemption arcs in comedy.' },
      { rank: 2, name: 'Kaguya Shinomiya', category: 'Fan Favorite', role: 'Vice President', commentary: 'A wealthy heiress torn between pride and genuine teenage infatuation.' }
    ],

    source: {
      title: 'Kaguya-sama: Love Is War',
      originalTitle: 'かぐや様は告らせたい',
      author: 'Aka Akasaka',
      type: 'Manga',
      volumes: '28 Volumes / 281 Chapters',
      publicationStatus: 'Completed (2015 – 2022)',
      adaptationStatus: 'Partially Adapted',
      coverage: 'Anime and Movie adapt up through Chapter 151 (Volume 15).',
      notes: 'Chapters 152 to 281 remain available in the completed manga.'
    }
  }
];

/**
 * Helper function to retrieve all available section tabs for an anime object.
 * Returns only tabs that have actual data.
 * "My Take" ('review') is placed in the FIRST position when present.
 */
export function getAvailableTabs(anime) {
  if (!anime) return [];
  const tabs = [];

  // 1. My Take (FIRST position when present or when watched with a personal rating)
  const hasReviewContent = anime.review && (
    anime.review.heading ||
    (Array.isArray(anime.review.paragraphs) && anime.review.paragraphs.length > 0) ||
    (typeof anime.review === 'string' && anime.review.trim().length > 0) ||
    anime.review.summary ||
    anime.review.verdict
  );
  const isWatchedWithRating = anime.honestyStatus === 'watched' && (anime.personalRating !== undefined && anime.personalRating !== null);

  if (hasReviewContent || isWatchedWithRating) {
    tabs.push({ key: 'review', label: 'My Take' });
  }

  // 2. Watch Order
  if (anime.watchOrder && anime.watchOrder.length > 0) {
    tabs.push({ key: 'watch-order', label: 'Watch Order', count: anime.watchOrder.length });
  }

  // 3. Filler List
  if (anime.fillerList && anime.fillerList.ranges && anime.fillerList.ranges.length > 0) {
    tabs.push({ key: 'filler-list', label: 'Filler List' });
  }

  // 4. Characters
  if (anime.characters && anime.characters.length > 0) {
    tabs.push({ key: 'characters', label: 'Characters', count: anime.characters.length });
  }

  // 5. Manga & Light Novel
  if (anime.source && (anime.source.title || anime.source.type)) {
    tabs.push({ key: 'source', label: 'Manga & Light Novel' });
  }

  // 6. Power System
  if (anime.powerSystem && (typeof anime.powerSystem === 'string' || anime.powerSystem.paragraphs?.length > 0 || anime.powerSystem.name)) {
    tabs.push({ key: 'power-system', label: 'Power System' });
  }

  return tabs;
}

/**
 * Helper function to determine the preferred default tab.
 * Prefers "My Take" ('review') if available; otherwise falls back to the first available tab.
 */
export function getDefaultTabKey(anime, availableTabs) {
  if (!availableTabs || availableTabs.length === 0) return null;
  const reviewTab = availableTabs.find((t) => t.key === 'review');
  if (reviewTab) {
    return 'review';
  }
  return availableTabs[0].key;
}
