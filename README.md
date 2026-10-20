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
- 152 active questions, expanded from 56, each with at least 100 canonical answers (aliases do not count toward the minimum). The acting question includes 31,840 names. The 231,944-key dictionary remains available: 13.56 times the initial 17,100 lemmas, including documented inflections.
- Global topics such as cuisines, films, musicians, footballers, brands, science and landscapes, valued for an audience in Spain. Repetitive letter and word-length variants are retired from new games.
- Questions are shown during play. The public interface has no question catalog, answer browser, off-round checker or pre-game suggested solutions. After completing the daily, three highest-scoring canonical answers are revealed for each of its seven questions, with editorial estimates identified and tied scores explained. Old catalog links redirect to the daily mission.
- Current scoring: 0 for a miss, then 10, 30, 60, 85 and 100; rarer answers earn more, with multiple 100-point answers possible. Legacy games retain the 15-point editorial tier. Maximum: 700. Each point advances the ship 10 km.
- A 3-second preview, then 25 seconds. Invalid answers allow retries; one accepted answer ends the round. At zero, the current draft receives one exact final check.
- Accent-insensitive matching, aliases and gender/plural variants where supplied, and confirmation of unambiguous one-character typo suggestions. The letter ñ remains distinct.
- A source-aware result for each round and a final recap with the player’s answers and points; completed dailies additionally unlock the top answers for the played questions.
- Autosave, draft and timer recovery after reload, local history, daily streaks, score distribution, and five unlockable ship paints.
- Spoiler-free share text and challenge links that reproduce the same seven prompts and compare the sender's score on completion.
- Sound, reduced motion, keyboard interaction, responsive layout, JSON export/import, and a visible explanation of data provenance and scoring.
- All runtime files and fonts are local. There are no ads or analytics, and no requests to Krillion.

Challenge links use the game's current URL. Links created on the GitHub Pages site can be shared with other devices. A localhost link is useful only where that local server is accessible.

## Data and important distinctions

The edition reviewed on **19 October 2026** combines recent Spain data and **explicitly labelled editorial estimates**, as approved for answers without recent measurements:

- Wikimedia country-ES daily lists for Spanish Wikipedia, **1 September–18 October 2026**: sums of published rounded entries, at least three listed days. Not total visits, unique readers or recognition percentages. Unlisted days are unknown, never zero.
- The latest INE name/surname publication, **23 April 2026**, refers to residents at **1 January 2025**. Includes 62,438 normalized first names and 86,487 surnames, with at least 20 recorded residents. Frequency bands determine scores.
- Vocabulary uses editorial estimates reviewed in 2026, identifying historical native-Spain SPALEX references from **2014–2017** when available. This historical survey is never described as a new 2026 measurement. Paella remains common at 10 points.
- Other answers and explicit exceptions use labelled editorial scores. Wikipedia/Wikidata and GeoNames expand valid named-answer coverage; global link counts and mixed-date population figures never rank familiarity in Spain.

No representative 2026 recognition survey or player-choice statistics are claimed. See **Datos y fuentes** in the game for the exact score bands. The pinned database plays offline after downloading its assets; updates require a deliberate research refresh.

The archive is deterministic by date. Dates before the game's launch are practice missions, not a fabricated history of published puzzles. Categories intentionally recur across chapters, allowing different answers. Answer lists are finite and may omit valid terms.

See [DATA-EXPANSION.md](DATA-EXPANSION.md) for counts, methodology, and limitations, [RESEARCH.md](RESEARCH.md) for the original-game investigation, and [DATA-LICENSES.md](DATA-LICENSES.md) for attribution.

## Verification

```powershell
npm test
```

The tests cover all 152 current questions and the 56 preserved previous questions, the canonical minimum of 100, familiar examples in every category, Messi/CR7/metro ligero, rarity bands, INE and readership provenance, all 210 chapters, timers, normalization, saved-game compatibility and score totals. Browser QA includes a complete seven-round archive mission and the retired-catalog redirect and daily alternatives that unlock only after all seven rounds; daily browser QA uses a separate local origin and does not consume the public daily mission.

## Files

`dist/` is a buildless static site. `engine.js` handles game logic; `categories.js` and `spain-categories.js` preserve supported old editions; `curated-categories.js` retains the previous reviewed bank; `focused-categories.js` builds the current scoped questions from stable references and sourced additions. `data.json` preserves the dictionary and older snapshots; `repertory.json` contains the compatible base bank, scores, evidence labels and source hashes; `focused-repertory.json` defines the current questions. `daily-catalog.js` freezes dated editions so database changes cannot silently replace a published daily mission. Editable question lists, reviewed answers and aliases live in `content/`. There are no production dependencies.

For data maintenance, install Python 3.12+ dependencies with `python -m pip install --target .cache/python-tools -r requirements-data.txt`, then run `powershell -File scripts/import-ine.ps1` and `npm run data:refresh`. Network imports are cached and respect rate-limit responses. Existing bundled snapshots suffice for CI, testing, and hosting; deployment does not call external research services. INE download TLS verification remains enabled. Refreshing sources can change puzzles: deliberately bump data versions and retain compatibility fixtures.

Version 1 and 2 completed results remain saved. Their challenge links retain their question selection. Compatible broad questions also receive the reviewed answers and aliases from more specific categories; already recorded scores are not recalculated. Practice modes use version 4 and separate save keys. The shared daily retains the previous edition through 20 October 2026 and switches to version 4 on 21 October at Madrid midnight. Historical editions remain available without deleting history. Daily statistics deduplicate by civil date.

This local implementation does not include OAuth, cloud sync, payments, advertising, a central friends leaderboard, a live global percentile service, or Krillion's multiplayer party game. Local streaks and challenge scores are not protected against someone deliberately editing browser storage or links.

## Visibility of the answer bank

The website does not offer a question/answer catalog or reveal the solution lists after playing. This is interface-level concealment: GitHub Pages serves a static client, so a technical user can still inspect downloaded game data. The public source repository is also readable. Actual server-side secrecy would require a backend to select prompts and validate answers without sending the bank to the browser.

The expanded repertory can be rebuilt from the cached source snapshots with `npm run data:compile`. A full network refresh uses `npm run data:refresh`. Future daily editions must begin on a future date; published daily pools must remain unchanged. The Pages build rejects an unpublished draft catalogue or incompatible data snapshots.
