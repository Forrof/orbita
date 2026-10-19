# ÓRBITA

A complete static web game in Spanish, aimed at Spain. Seven categories, 25 seconds per answer, and more points for less common answers. An original illustrated space expedition replaces Krillion's underwater setting.

**Play online:** [forrof.github.io/orbita](https://forrof.github.io/orbita/) · **Repository:** [Forrof/orbita](https://github.com/Forrof/orbita)

## GitHub Pages

The included [GitHub Actions workflow](.github/workflows/pages.yml) tests the game, prepares `_site/`, and publishes it to GitHub Pages whenever `main` is updated. In the repository's **Settings → Pages → Build and deployment**, select **GitHub Actions**. See [GITHUB-PAGES.md](GITHUB-PAGES.md) for upload and deployment instructions.

GitHub Pages serves the complete game directly; visitors do not need Node.js or an account. Data attribution is included in the deployed files. Progress is stored per browser and website origin: export your local progress from **Ajustes** and import it on the hosted game if you want to carry it over.

## Play

Local hosting requires Node.js 22 or newer. No package installation, API key, or account is needed. The included snapshot needs no external data service to play.

On Windows, double-click **Start-Orbita.cmd**. Keep its terminal open while playing.

Or run this from this directory:

```powershell
npm start
```

Open **http://localhost:4173**. Stop the server with Ctrl+C. To use another port, set `PORT` before starting. The server binds to this computer's loopback address.

## Included

- One daily mission, shared by date, resetting at midnight in Europe/Madrid, including daylight-saving changes.
- Unlimited missions and a date-based practice archive.
- Seven themed constellations with 30 chapters each: everyday life, nature, words, Spain, science, culture, and the wider world.
- 474 active questions and 231,944 distinct accepted word forms after accent normalization: 13.56 times the original 17,100-lemma database. This includes inflections, not 231,944 separate lemmas or independent measurements.
- Global topics such as cuisines, music, cinema, professions, minerals, anatomy, languages, currencies, and landscapes, ranked using evidence from Spain.
- A searchable question explorer with topic filters, accepted-answer counts, previews, scores, and source evidence.
- The original fixed point schedule: 0, 10, 15, 30, 60, 85, 100; 700 maximum. Each point advances the ship 10 km.
- A 3-second preview, then 25 seconds. Invalid answers allow retries; one accepted answer ends the round. At zero, the current draft receives one exact final check.
- Accent-insensitive matching, aliases and gender/plural variants where supplied, and confirmation of unambiguous one-character typo suggestions. The letter ñ remains distinct.
- A source-aware result for each round and searchable, tier-filtered answer reveals after the mission.
- Autosave, draft and timer recovery after reload, local history, daily streaks, score distribution, and five unlockable ship paints.
- Spoiler-free share text and challenge links that reproduce the same seven prompts and compare the sender's score on completion.
- Sound, reduced motion, keyboard interaction, responsive layout, JSON export/import, and a visible explanation of data provenance and scoring.
- All runtime files and fonts are local. There are no ads or analytics, and no requests to Krillion.

Challenge links use the game's current URL. Links created on the GitHub Pages site can be shared with other devices. A localhost link is useful only where that local server is accessible.

## Data and important distinctions

New vocabulary questions use **SPALEX recognition scores from its native-Spain cohort**, exclusively `percent_nts` and `count_nts`. There are 44,853 words with direct measurements. Another 203,036 attested spellings inherit their measured lemma's score for letter and grammatical questions; the feedback identifies this inheritance. The 247,889 spellings collapse to 231,944 accepted keys when accents are ignored. The letter ñ remains distinct. Semantic vocabulary questions require direct measurements.

For example, **paella is common: 100% recognition among the 122 Spain-cohort participants who evaluated it, worth 10 points**. Absolute recognition thresholds avoid making familiar words artificially rare within a category. SPALEX is a sample collected in 2014–2017, not a current representative survey, and it measures written-word recognition rather than every meaning or players' likely choices.

Questions about named films, people, and sport use a separately labelled **Spain readership-interest index** from Wikimedia's country-ES daily lists, restricted to Spanish Wikipedia during September 2026. This is a sum of published rounded entries, not exact monthly views or a recognition percentage. The answer sets include only qualifying published records and are finite.

The 100-point gem and any 15-point false friend remain editorial choices. Vocabulary gems must have Spain recognition below 90%. Pan-Hispanic corpus frequencies validate inflection attestation only; **they do not rank new games**. The original corpus and INE population rules remain available for saved games made with version 1.

The archive is deterministic by date. Dates before the game's launch are practice missions, not a fabricated history of published puzzles. Categories intentionally recur across chapters, allowing different answers. Answer lists are finite and may omit valid terms.

See [DATA-EXPANSION.md](DATA-EXPANSION.md) for counts, methodology, and limitations, [RESEARCH.md](RESEARCH.md) for the original-game investigation, and [DATA-LICENSES.md](DATA-LICENSES.md) for attribution.

## Verification

```powershell
npm test
```

The 22 tests cover scoring and perfect totals, all 210 themed chapters, deterministic daily/challenge prompts, Madrid dates, timer recovery, retries, aliases/ñ, typo confirmation, corrupt saves, and streaks. Expansion checks verify the tenfold minimum after normalization, Spain-only evidence, paella's common score, absolute recognition thresholds, inflection provenance, and compatibility with version 1 puzzles.

Browser checks include the original seven-round mission, draft recovery and responsive layout, plus a complete version 2 archive mission, source feedback, the question explorer, and search within a 35,090-answer category. Browser QA does not consume the daily mission.

## Files

`dist` is a buildless, deployable static site. `engine.js` contains pure game logic; `categories.js` preserves the original repertory; `spain-categories.js` and `topics.js` build the expanded questions; `app.js` provides UI, routing, and persistence; `data.json` holds the pinned source snapshot and SHA-256 hashes. `server.mjs` uses Node's standard library. There are no production dependencies.

`npm run data:refresh` reimports the pinned public sources and requires internet access. Downloads are cached in `.cache/`; the country-statistics importer respects request pacing and `Retry-After`. `scripts/baseline-v1.json` freezes the original repertory. Changing source snapshots or category logic changes puzzles: issue a new data version deliberately, preserve supported old rules, and update migration tests. Started and completed version 1 games retain their original questions and scores; new games use version 2. Keep the included snapshot unchanged for reproducible missions.

This local implementation does not include OAuth, cloud sync, payments, advertising, a central friends leaderboard, a live global percentile service, or Krillion's multiplayer party game. Local streaks and challenge scores are not protected against someone deliberately editing browser storage or links.
