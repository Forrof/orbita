# Krillion investigation and Órbita implementation

**Version 3 data update:** the original mechanics investigation below is historical. New games use 56 distinct question themes with at least 100 canonical answers each, replacing 474 repetitive/sparse version 2 questions. The October 2026 edition uses recent Spanish readership, the INE publication of April 2026, and explicitly labelled editorial estimates. See [DATA-EXPANSION.md](DATA-EXPANSION.md).

Investigated on **19 October 2026** using the public website, an actual daily-game round, unlimited-mode UI, public pages, and the client JavaScript delivered by the website. This is a mechanics inventory, not a claim to possess the creator's private answer database or server implementation.

## The core loop

1. A daily game contains **seven prompts**, identical for everyone on that day. The original starts a new day at **midnight Eastern Time**.
2. The player starts a dive, receives a **three-second prompt preview**, then **25 seconds** to name one matching thing.
3. An accepted answer ends the round. A rejected guess can be replaced while the timer keeps running. A typo may match an alias, and optional correction previews can require confirmation.
4. At timeout, the client submits a nonempty draft for a final check; an invalid or absent answer yields zero.
5. The feedback screen shows the canonical answer, tier, fixed score and depth movement. The player explicitly starts the next prompt; the timer does not run between rounds.
6. Scores accumulate across the seven answers. One point adds **10 metres** in the original: a perfect 700-point game reaches 7,000 metres.
7. The completed result includes a score band, per-round trajectory, shareable symbols, a round recap, and a searchable/filterable reveal of accepted answers. The original also obtains aggregate player statistics from its backend.

Observed state phases: `intro → preview → answering → feedback`, repeating seven times, then `done`. Drafts, phases, results and absolute deadlines are stored; a reload restores elapsed time. The menu explicitly says the timer keeps running while open.

## Exact public scoring schedule

| Original tier | Points | Meaning in the original | Órbita tier |
| --- | ---: | --- | --- |
| Miss | 0 | No accepted answer | Sin señal |
| Plankton | 10 | Obvious/common answer | En tierra |
| Too Clever | 15 | The familiar supposedly obscure answer | Falsa pista |
| Schooler | 30 | Familiar but less obvious | Despegue |
| Rare | 60 | Uncommon answer | Estratosfera |
| Deep Cut | 85 | Very obscure answer | Espacio profundo |
| One in a Krillion | 100 | The prompt's designated gem | Órbita |

These are discrete scores, not a continuous rarity percentage. There is no speed bonus in the public client scoring model. Maximum: **7 × 100 = 700**.

The publicly shipped score bands are 0–150, 151–250, 251–350, 351–449, and 450+. Órbita retains these boundaries.

## How the original chooses and validates answers

The [official FAQ](https://krillion.io/faq) describes aggregating and cleaning question-specific sources; familiarity data assists some rarity assignments, with editorial judgment for others. Gems emphasize satisfying discoveries, and aliases can make typo matching generous. Its full server-side ranking, curation decisions and answer database are not public. We therefore cannot reproduce its precise unknown probabilities or truthfully claim to have retrieved every answer.

In a live daily round, entering **Rosalia** was accepted as **Rosalía** and returned **Rare, +60** and **600 metres**. The result waited for a manual next-round action. The same game's instruction panel confirmed seven prompts, 25 seconds, daily one-attempt play and the 10-metre conversion.

The public client requests today's prompts, submits answers for server validation, fetches the completed answer reveal, records daily completion and retrieves popularity data through separate endpoints. Reading that client establishes UI behavior; it does not reveal the private judging implementation. No account, purchase, protected endpoint or access control was bypassed.

## Surrounding modes and progression

| Feature | Evidence in the reference | Local implementation |
| --- | --- | --- |
| Daily | Seven shared prompts, one dive per day, reset at midnight ET | Same loop; daily key and midnight use Europe/Madrid |
| Unlimited | Numbered repeatable dives and a dive log | Numbered deterministic missions; saved local history |
| Archive | Calendar/logbook for earlier daily games; access tied to unlocks | Date-generated practice archive; no payment; does not extend streaks |
| Themed packs | Four 30-chapter packs: English words/language, movies, sports, geography | Four 30-chapter Spanish constellations: vocabulary, nature, daily life, Spain |
| Accounts | Google account linking and recovery across devices | Local persistence plus export/import; no pretend login |
| Personal statistics | Current/best streak, daily games, best daily result, mode histories | Local streaks, best/average score, score histogram, histories |
| Wardrobe/buddies | A starter and unlocks at 5, 14, 30 and 45 streak days | Five ship paints at those same milestones |
| Settings | Sound, correction preview, clearing rejected entries, share-link preference | Sound, confirmed correction suggestions, clear-rejected option, reduced motion |
| Friends | Invitations and comparison of daily results after finishing | Self-contained challenge link; comparison after finishing, without a central leaderboard |
| Sharing | Spoiler-free result text, copy/native sharing where available | Spoiler-free clipboard text with fallback and deterministic challenge link |
| Aggregate results | Backend score distribution, percentiles and answer popularity | Only the player's own statistics; no synthetic global percentages |
| Commercial layer | Pack/archive unlocks, ads; purchases remove ads; restore/link purchases | All included content free locally; no ads, payments or purchase simulation |
| Party extension | Public client advertises a separate Puffer Party mode as hot-potato play for 2–16 players; FAQ still describes multiplayer as planned | Outside this single-player local game; live match mechanics not asserted as verified |
| External links | Merchandise and a separate word-association game | Not reproduced; they are not part of the core game loop |

The FAQ's multiplayer description and a newer client-side party promotion are not fully consistent. The advertised party should be treated as a separate extension whose complete live rules were not verified here.

## What is exact, and what is deliberately new

The **game idea and mechanical skeleton** remain: think of a rare member of a category under time pressure, seven times, with the same discrete scoring ladder, editorial traps/gems, a daily restriction, and cumulative visual travel.

The **expression is new**: space travel, a rocket, Earth, stars and warm printed-paper colors; original Spanish interface writing and vector artwork; Spanish answer sets; and distance rising away from Earth instead of an ocean descent. No original assets or implementation code are copied.

The **rarity model is independently implemented** and openly explained. Within a category, answers with observed counts are ranked from most to least common. Rank/(n−1) below 0.12 scores 10, below 0.45 scores 30, below 0.78 scores 60, and the rest scores 85. Ties use Spanish alphabetical order. The 100-point curated gem and 15-point curated trap override those ranks. No observed count means an explicitly editorial score. Population replaces lexical count for geographic questions.

This model is reproducible and grounded in actual observations, but cannot be called the same secret rarity algorithm as Krillion. The lexical corpus is pan-Hispanic; the population tables and geographic prompts are Spain-specific.

## Data retrieval and reproducibility

- [Spanish Data](https://github.com/doozan/spanish_data): 17,100 selected dictionary lemmas and available observed inflections. Credited source: [FrequencyWords](https://github.com/hermitdave/FrequencyWords) / [OpenSubtitles](https://www.opensubtitles.org/). Filter, source URL and SHA-256 hash are recorded in the import script and JSON.
- [INE figures published in the BOE](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-25362): 1 January 2025 population, including 52 provincial/autonomous-city records, 50 provincial capitals, 11 islands. The imported source's exact figures are retained.
- [RAE CREA frequency catalogue](https://corpus.rae.es/lfrecuencias.html) and the published [SUBTLEX-ESP research](https://biblio.ugent.be/publication/2001948) were considered. The direct RAE dataset was unavailable to the importer, so the game does not claim to use CREA or SUBTLEX-ESP counts.

The 71 implemented categories include independent semantic lists, statistical geography subsets, and dictionary predicates such as ñ, rr, endings, word lengths and infinitives. Spanish spelling variants and co-official place names are accepted where documented. Shared missions are seeded from date or chapter and the fixed repertory version. Future changes must version the repertory to avoid silently changing a live daily mission.

## Verification record

**16 automated tests passed.** These check actual official population samples, all 120 pack chapters, seven-prompt uniqueness, score limits and band boundaries, exact timer edges and restoration, timeout draft submission, rejection and duplicate-scoring behavior, Spanish aliases and ñ, typo handling, incompatible/corrupt save rejection, and streak rules.

An actual browser run completed seven unlimited rounds for **510/700**: five 100-point gems, one accepted 10-point profession variant, and one skipped 0-point round. It included a rejected guess followed by a valid retry, a reload that preserved the answer draft, accent-free entry, a searchable reveal, and final result rendering. The daily mission was left unplayed. Desktop and 390px mobile layouts were inspected in the browser.

## Primary reference pages

- [Krillion daily game](https://krillion.io/)
- [Krillion FAQ](https://krillion.io/faq)
- [Unlimited](https://krillion.io/unlimited/classic)
- [Packs](https://krillion.io/packs)
- [Personal logbook and unlock milestones](https://krillion.io/account)
- [Friends](https://krillion.io/friends)
- [Archive](https://krillion.io/archive)
