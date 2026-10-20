# Data and asset attribution

## Version 3: reviewed 2026 repertoire

The explicit Spanish question/answer lists and alias decisions in `content/` are independently curated for this game. Historical lexical evidence retains the SPALEX / Wiktionary / FrequencyWords attribution below. Historical recognition is labelled as an editorial reference, not a 2026 survey. The complete current derived answer-bank data is supplied under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), subject to the source-specific notices retained here; source authors do not endorse the game.

**INE, www.ine.es:** [Nombres y apellidos más frecuentes](https://www.ine.es/dyngs/INEbase/operacion.htm?c=Estadistica_C&cid=1254736177009&idp=1254735572981&menu=resultados), published 23 April 2026, reference 1 January 2025. [Names workbook](https://www.ine.es/daco/daco42/nombyapel/nombres_por_edad_media.xlsx), [surnames workbook](https://www.ine.es/daco/daco42/nombyapel/apellidos_frecuencia.xls). Changes: selected published aggregate frequencies >=20, joined matching first names across sexes, normalized equivalent spellings, selected first-surname frequency, and applied documented score bands. These are aggregate counts, not individual records. Responsibility for the derived scoring and transformed data rests with Órbita, not the INE.

**Wikimedia Foundation / Wikimedia Analytics:** country-ES top-page statistics, all access, Spanish Wikipedia, 1 September through 18 October 2026. [API documentation](https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/reference/page-views.html). Changes: filtered namespaces and project, required at least three listed days, summed published rounded values, matched titles and applied score bands. Unlisted days are unknown. No complete visit totals or recognition percentages are claimed.

**Wikipedia contributors and Wikidata contributors:** titles, public category memberships, entity membership and aliases through the public MediaWiki API and Wikidata Query Service. [Wikipedia reuse terms](https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), [Wikidata structured-data CC0](https://www.wikidata.org/wiki/Wikidata:Licensing). Article names identify source pages and their attribution histories; source query URLs and hashes are bundled. Changes: selected thematic membership, normalized titles, merged aliases and added reviewed Spanish anchors. Worldwide metadata establishes coverage only, not Spanish familiarity. No article prose or original-game answer bank is reproduced.

**GeoNames:** [GeoNames geographical database](https://www.geonames.org/), [daily downloads and attribution terms](https://www.geonames.org/export/). Source files `cities15000.zip` and `ES.zip`. Changes: selected populated places and defined natural-feature codes, added Spanish exonyms and merged spelling variants. Population is used only to select a finite place catalogue; its varying observation dates are not claimed as 2026 population statistics and never determine scores. GeoNames is credited under its Creative Commons Attribution terms.

The rejected automatic WordNet taxonomy expansion is not included in the current game. Vocabulary questions use explicit reviewed Spanish lists. Source manifests and SHA-256 hashes for the current inputs are in `dist/repertory.json`; older editions remain in `dist/data.json`.

## Version 2: SPALEX recognition data

**Aguasvivas, José, et al. · SPALEX, Word information, version 4.** [Dataset and authorship](https://figshare.com/articles/dataset/Word_information/5924794), DOI [10.6084/m9.figshare.5924794.v4](https://doi.org/10.6084/m9.figshare.5924794.v4). Distributed under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/). Original file: [word_info.csv](https://ndownloader.figshare.com/files/11826623).

Changes: selected `spelling`, `percent_nts`, and `count_nts` from the native-Spain cohort, retained adequate samples, converted to compact records, linked independently attested inflections to measured lemmas, and derived game score bands and editorial gems. Recognition data collected in 2014–2017 is not a representative current population poll. The source authors do not endorse Órbita or its derived scoring.

## Version 2: form validation and attestation

[Spanish Data by doozan](https://github.com/doozan/spanish_data), [es_allforms.csv](https://github.com/doozan/spanish_data/blob/master/es_allforms.csv), provides Spanish form-to-lemma and part-of-speech mappings derived from [Wiktionary](https://en.wiktionary.org/). The repository identifies its general license as [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), with source-specific exceptions. Wiktionary-derived material retains its applicable attribution and share-alike obligations; see [Wikimedia Terms of Use](https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use) and [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). This attribution supplements, and does not remove, the original Wiktionary contributor attribution accessible through page histories.

[FrequencyWords by Hermit Dave](https://github.com/hermitdave/FrequencyWords), specifically [2018/es/es_full.txt](https://github.com/hermitdave/FrequencyWords/blob/master/content/2018/es/es_full.txt), uses OpenSubtitles-derived counts. Its data is [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) and its generator code is MIT. Version 2 uses only the presence of a form to validate that an inflection is attested; its pan-Hispanic occurrence counts do not determine rarity. Changes include filtering, joins to measured lemmas, deduplication, and compact JSON conversion. Derived lexical mappings retain the applicable attribution and share-alike terms.

## Version 2: Wikimedia country statistics and article metadata

Source: **Wikimedia Foundation / Wikimedia Analytics**, public aggregated country-ES daily top-page lists, all access methods, September 2026, filtered to Spanish Wikipedia. See the [official API reference](https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/reference/page-views.html) and [country-data documentation](https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/concepts/country-data.html). These are published aggregate statistics, not downloaded individual reader records.

Changes: summed published rounded entries, required at least three listed days, resolved article redirects, and derived category-relative interest bands. The index is not a complete exact monthly count. Article category metadata, titles, and aliases come from Wikipedia's public API and are credited to **Wikipedia contributors**, subject to applicable [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) attribution/share-alike terms. Article titles retained in the data identify their source articles; contributor histories are accessible through those articles. Editorial category boundaries and aliases were added for the game. Wikimedia does not endorse these selections or scores.

Source URLs, periods, and SHA-256 hashes are recorded in `dist/data.json`. The full transformation and interpretation are documented in [DATA-EXPANSION.md](DATA-EXPANSION.md).

## Version 1 legacy Spanish frequency data

Source: [Spanish Data, by doozan](https://github.com/doozan/spanish_data), specifically [frequency.csv](https://github.com/doozan/spanish_data/blob/master/frequency.csv). The author describes this as Spanish lemmas with parts of speech and combined word forms and credits [Hermit Dave's FrequencyWords](https://github.com/hermitdave/FrequencyWords).

Spanish Data explicitly identifies `frequency.csv` as **CC BY-SA 3.0**, with FrequencyWords attribution. [CC BY-SA 3.0 license](https://creativecommons.org/licenses/by-sa/3.0/). FrequencyWords separately identifies its content as **CC BY-SA 4.0** and its generator code as MIT; [CC BY-SA 4.0 license](https://creativecommons.org/licenses/by-sa/4.0/).

Underlying corpus: [OpenSubtitles](https://www.opensubtitles.org/), via the FrequencyWords corpus described by its maintainers. The corpus is pan-Hispanic and not restricted to Spain.

Changes made for Órbita: selected lowercase Spanish alphabetic lemmas with noun, verb, adjective or adverb tags, no warning flags, 3–18 characters, and at least ten occurrences; retained observed inflections for semantic-category aliases. Stored compact JSON records and used category-relative ranks for game scoring. The derived lexical data retains the attribution and share-alike terms of the credited frequency source. This is not an endorsement by the source authors.

The imported source hash, URL and import date are included in `dist/data.json`. Independently curated semantic sets and gems live in `dist/categories.js`; missing numeric observations remain null, never fabricated.

## Version 1 legacy Spanish population statistics

**Source: INE, www.ine.es.** Municipal-register figures at **1 January 2025**, made official in [Real Decreto 1117/2025, BOE-A-2025-25362](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-25362), published 11 December 2025. Imported the annex's provincial/autonomous-city, provincial-capital, and island population tables.

Changes: parsed published integer population figures, added familiar Spanish and co-official place aliases, filtered category subsets, and derived rarity ranks. The exactness and reliability of the derived game scoring are the responsibility of Órbita, not the INE or BOE.

## Clinical and thematic coverage · October 2026 revision

**Ministerio de Sanidad, España:** [CIE-10-ES 6th edition, 2026, diagnostic reference table](https://www.sanidad.gob.es/estadEstudios/estadisticas/normalizacion/CIE10/2026/Diagnosticos_Tabla_Referencia_CIE10ES_2026.xlsx), linked from the [official classifications portal](https://www.sanidad.gob.es/estadEstudios/estadisticas/normalizacion/). The table credits its ICD-10-CM origin and Spanish translation. Órbita extracts factual condition names from selected diagnostic categories, excludes administrative and external-cause records, and adds editorial common-name aliases. It does not reproduce the manual, clinical definitions or coding advice. Classification membership is never presented as a familiarity statistic. Original source URL, diagnostic codes and source-file SHA-256 are retained in `content/imported-health-2026.json`.

**US National Cancer Institute:** its [Spanish list of cancers by body location](https://www.cancer.gov/espanol/tipos/por-partes-cuerpo) was consulted to review common Spanish disease names. No US incidence statistics are used for game rarity.

**Real Sociedad Española de Química:** the [periodic table](https://tablaperiodica.analesdequimica.es/) was consulted for official chemical symbols. Only the 118 confirmed elements are included; prospective elements displayed on educational tables are excluded. Symbols are aliases of existing elements, not extra canonical answers.

Wikipedia contributors and the lexical sources credited above supply additional topic coverage. Candidate category pages do not automatically enter the game. Research sources are listed per question in `content/category-source-audit.json`; approved editorial vocabulary and alternative names are stored separately. The registry is maintenance data and is not a public in-game solution browser. Sources do not endorse Órbita or its scores.

## Fonts

**DM Sans**, Colophon Foundry and its credited contributors, distributed under the SIL Open Font License 1.1. Font files are hosted locally. The complete license is at `dist/assets/DM-Sans-LICENSE.txt`. Downloaded from Google Fonts' official font service.

## Artwork and reference game

The rocket, planets, orbit graphics, icon, interface and CSS were created for this project. No Krillion artwork, sound files, text, question banks, answer sets or source-code implementations are included.

[Krillion](https://krillion.io/) was studied as the requested game-design reference. Its name and assets belong to their respective owners. Órbita's source is an independent implementation of the observed gameplay rules.
