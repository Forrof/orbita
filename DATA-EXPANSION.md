# Spain-based data expansion · version 2026-10-19.2

The subject can come from anywhere. Familiarity is evaluated using observations from Spain. This replaces the initial pan-Hispanic frequency ranking for new games.

## Database size

| Measure | Count |
| --- | ---: |
| Original imported lemmas | 17,100 |
| Words measured directly in the Spain cohort | 44,853 |
| Additional attested inflected spellings linked to measured lemmas | 203,036 |
| Total stored spellings | 247,889 |
| Distinct accepted keys after accent normalization | 231,944 |
| Expansion against the original lemma count | 13.56× |
| Active questions | 474 |
| Themed packs / playable chapters | 7 / 210 |

The expansion compares accepted forms against the original lemma database. It does not mean that 231,944 distinct lemmas were surveyed. Accented alternatives and aliases are not counted again. Normalization preserves ñ. The entire normalized vocabulary is reachable through the all-words question.

| Pack | Active questions |
| --- | ---: |
| Everyday life | 47 |
| Nature | 47 |
| Words and grammar | 280 |
| Spain | 13 |
| Science | 27 |
| Culture | 36 |
| Wider world | 24 |

Questions include independent semantic lists and letter, grammatical, and length constraints derived from the larger database. The 474 questions are not 474 unrelated research datasets. Each registered question has at least seven accepted answers and a reachable editorial gem. Daily, unlimited, and archive missions draw one question from each pack. Themed missions contain seven distinct questions from their chosen pack.

## Vocabulary: direct evidence from Spain

[SPALEX Word information v4, Aguasvivas and collaborators](https://figshare.com/articles/dataset/Word_information/5924794), DOI [10.6084/m9.figshare.5924794.v4](https://doi.org/10.6084/m9.figshare.5924794.v4), supplies word recognition observations collected between May 2014 and December 2017. The importer uses **only `spelling`, `percent_nts`, and `count_nts`**, the native-Spain cohort. Pooled and Latin-American recognition columns and the separate corpus-frequency fields do not determine the scores.

The import retains direct measurements with at least 30 observations. For an attested inflection without its own measurement, a dictionary mapping links it to a measured lemma. The form inherits that lemma's recognition and sample size; it does not receive a fabricated independent measurement. The feedback explicitly identifies the measured word. This inheritance is restricted to letter and grammatical questions. Semantic vocabulary lists require the word itself to have a direct measurement.

[Spanish Data's form-to-lemma mappings](https://github.com/doozan/spanish_data) validate forms and parts of speech. The [complete FrequencyWords Spanish file](https://github.com/hermitdave/FrequencyWords/blob/master/content/2018/es/es_full.txt), sourced from OpenSubtitles, supplies a boolean check that an inherited inflection has been observed. Those pan-Hispanic counts are not used to rank the new games. Direct SPALEX words do not depend on corpus attestation.

| Spain recognition | Points |
| --- | ---: |
| At least 98% | 10 |
| At least 90%, below 98% | 30 |
| At least 65%, below 90% | 60 |
| Below 65% | 85 |

Equal recognition levels retain equal score bands. The 100-point gem is an editorial selection with recognition below 90%; occasional 15-point false leads must be familiar words. These are game-design exceptions, not new statistical observations.

**Paella:** 100% recognition among 122 participants in the Spain cohort, therefore 10 points. It cannot become a rare gem because the dish is less familiar abroad.

Limits: this is an opt-in sample, not a representative census or a current poll of Spain. Recognition of a written form does not prove familiarity with every meaning of a homograph. Lemma inheritance approximates familiarity with inflections. Recognition also differs from the probability that a player chooses a particular answer.

## Proper names: interest from readers in Spain

The importer requests Wikimedia's daily `top-per-country/ES/all-access/2026/09/DD` lists for all 30 days of September 2026, then retains only entries whose project is `es.wikipedia`. Country ES selects readers located in Spain; Spanish Wikipedia alone would not establish their location. See the official [page-view API reference](https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/reference/page-views.html) and [country-data methodology](https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/concepts/country-data.html).

For each article, the index sums its published `views_ceil` entries, merges resolved redirects, and requires appearances on at least three days. The snapshot contains 422 qualifying article records, of which subsets are admitted into playable topics. Wikipedia's public category metadata identifies films, actors, musicians, footballers, and related topics. Common spelling aliases are supplied where appropriate.

The index is **a sum of published rounded values**, not a complete monthly page-view count: unlisted days are unknown, not zero. It is not a recognition percentage or a measure of distinct people. Daily lists are limited, so these named-topic answer sets are deliberately finite and may be small; each question displays its accepted-answer count and preview. Current interest can reflect news events. This data is a clearly labelled proxy for familiarity, not a direct survey.

Within each such category, descending interest ranks map to the original 10, 30, 60, and 85-point bands at the 12%, 45%, and 78% boundaries. A designated editorial gem receives 100. Feedback shows the index and number of listed days instead of presenting it as recognition.

## Reproducibility and existing saves

`dist/data.json` records source URLs, periods, license notes, and SHA-256 digests, including individual country-statistics daily digests. `scripts/baseline-v1.json` preserves the initial data. Imports validate the tenfold minimum after normalization and derive the question-count manifest from the actual active categories.

Version 1's 71 categories remain available for started games, completed records, and compatible old challenge links. Their questions, order, and scoring are preserved. New games use version 2; an unstarted intro can upgrade. Historical results are not rescored or deleted.

The 22 automated tests cover both the original rules and expansion invariants. Browser verification completed a full version 2 archive mission, including direct Spain-recognition feedback, a 100-point gem, a familiar 10-point answer, and searchable answer reveals for a category containing 35,090 answers. The daily mission was left unplayed.
