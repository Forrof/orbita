"""Compile specific prompts with at least 100 actual concepts, preserving old IDs.

References share canonical answers with the previous bank; additional memberships
are explicit public records, never generated person names or inferred statistics.
"""
import argparse
import bisect
import collections
import hashlib
import json
import pathlib
import re
import unicodedata
import urllib.parse
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
VERSION = '2026-10-20.4'
TIER = {'common': 10, 'familiar': 30, 'rare': 60, 'deep': 85, 'gem': 100}
LATIN = str.maketrans({'ø': 'o', 'Ø': 'O', 'ł': 'l', 'Ł': 'L', 'đ': 'd', 'Đ': 'D', 'ð': 'd', 'þ': 'th', 'æ': 'ae', 'œ': 'oe', 'ß': 'ss', 'ı': 'i'})


def read(path):
    return json.loads((ROOT / path).read_text(encoding='utf-8'))


def norm(word):
    word = word.lower().replace('ñ', '~')
    word = ''.join(c for c in unicodedata.normalize('NFD', word) if unicodedata.category(c) != 'Mn').replace('~', 'ñ')
    return ' '.join(re.sub('[^a-zñ0-9 ]', ' ', word).split())


def geo_rows(file, member):
    with zipfile.ZipFile(ROOT / '.cache' / file) as archive:
        for line in archive.read(member).decode('utf-8').splitlines():
            row = line.split('\t')
            if len(row) >= 19:
                yield row


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--preview', action='store_true')
    args = parser.parse_args()
    bank = read('dist/repertory.json')
    parents = {q['id']: q for q in bank['questions']}
    specs = read('content/focused-questions.json')
    memberships = read('content/imported-focused-memberships.json')['memberships']
    manual = read('content/manual-focused-20261020.json')
    clinical = read('content/imported-health-2026.json')['entries']
    signals = {norm(r['title']): r for r in read('.cache/current-interest-2026.json')['entries'] if r['daysListed'] >= 3}
    signal_values = sorted(r['publishedViews'] for r in signals.values())
    review = read('content/focused-review.json') if (ROOT / 'content/focused-review.json').exists() else {}
    base = read('dist/data.json')
    cities = list(geo_rows('cities15000.zip', 'cities15000.txt'))
    spain = list(geo_rows('geonames-ES.zip', 'ES.txt'))
    indexes = {}
    for key, parent in parents.items():
        idx = collections.defaultdict(dict)
        for answer in parent.get('answers', []):
            for alias in [answer[0], *answer[1]]:
                idx[norm(alias)][norm(answer[0])] = answer
        indexes[key] = {key: next(iter(rows.values())) for key, rows in idx.items() if len(rows) == 1}

    def new_answer(word, aliases=None, score=None, article=None):
        aliases = list(dict.fromkeys((aliases or []) + [v.translate(LATIN) for v in [word, *(aliases or [])] if v.translate(LATIN) != v]))
        aliases = [alias for alias in aliases if norm(alias) != norm(word)]
        basis, count, days = 'editorial-2026', None, None
        signal = signals.get(norm(article or word))
        if score is None and signal:
            count, days = signal['publishedViews'], signal['daysListed']
            rank = 1 - bisect.bisect_right(signal_values, count) / max(1, len(signal_values))
            score = 10 if rank < .12 else 30 if rank < .45 else 60 if rank < .78 else 85
            basis = 'interest-2026'
        return [word, aliases, score if score is not None else 85, basis, count, days, None]

    compiled, deferred, resolved = [], [], {}
    for spec in specs:
        if spec.get('importOnly'):
            continue
        parent = parents.get(spec.get('parent'))
        idx = indexes.get(spec.get('parent'), {})
        result = {'id': 'q4-' + spec['id'], 'pack': spec['pack'], 'text': spec['text']}
        if parent:
            result['parent'] = parent['id']
        if parent and parent.get('dictionary'):
            result.update(all=True, dictionary=True, count=base['expansion']['uniqueNormalizedSpellings'] + len(parent.get('additions', [])))
            compiled.append(result)
            print(f'{result["id"]}: {result["count"]}', flush=True)
            continue
        records, record_aliases = {}, {}

        def add(word, aliases=None, score=None, article=None):
            word = word.strip()
            if not norm(word) or re.search('[\u0400-\u04ff]', word):
                return
            candidates = [word, *(aliases or [])]
            existing = next((idx.get(norm(v)) for v in candidates if idx.get(norm(v))), None)
            # Merge equivalent spellings/aliases of an already selected concept.
            selected_key = next((record_aliases[norm(v)] for v in candidates if norm(v) in record_aliases), None)
            selected = records.get(selected_key)
            if selected:
                existing = selected
            if existing and score is None:
                other_names = sorted(a for a in set([*existing[1], *(aliases or []), *([word] if norm(word) != norm(existing[0]) else [])]) if norm(a) != norm(existing[0]))
                row = [existing[0], other_names, *existing[2:]]
            else:
                row = new_answer(existing[0] if existing else word, list(dict.fromkeys([*(existing[1] if existing else []), *(aliases or []), *([word] if existing and norm(word) != norm(existing[0]) else [])])), score, article)
            key = norm(row[0])
            if key in records:
                previous = records[key]
                if row is not previous:
                    records[key] = [previous[0], sorted(set(previous[1] + row[1])), *previous[2:]]
            else:
                records[key] = row
            for alias in [word, *candidates, row[0], *row[1]]:
                record_aliases[norm(alias)] = key

        if spec.get('categories'):
            for title in memberships.get(spec['id'], []):
                if spec['id'].startswith('films-') and re.search(r'\((?:álbum|canción|miniserie|serie de televisión|videojuego|musical)\)', title, re.I):
                    continue
                if title in review.get(spec['id'], {}).get('exclude', []):
                    continue
                simple = re.sub(r' \([^)]*\)$', '', title)
                add(simple, [title] if simple != title else [], article=title)
            if spec.get('geo'):
                for row in spain:
                    if row[7] in spec['geo'].get('codes', []):
                        add(row[1], [row[2]])
        elif spec.get('geo'):
            geo = spec['geo']
            for row in cities if geo['type'] == 'city' else spain:
                if geo.get('country') and row[8] != geo['country']:
                    continue
                if geo.get('admin1') and row[10] != geo['admin1']:
                    continue
                if geo['type'] in ('city', 'town') and (row[6] != 'P' or row[7] in ('PPLX', 'PPLQ', 'PPLW')):
                    continue
                if geo.get('codes') and row[7] not in geo['codes']:
                    continue
                add(row[1], [row[2]])
        elif spec.get('icdPrefixes'):
            for row in clinical:
                if row['code'][0] in spec['icdPrefixes'] and not any(row['code'].startswith(prefix) for prefix in spec.get('excludeClinicalPrefixes', [])):
                    names = [row['word'], *row['aliases']]
                    ordinary = [re.sub(r'\b(?:de la|de las|de los|del)\b', 'de', name, flags=re.I) for name in names]
                    add(row['word'], list(dict.fromkeys([*row['aliases'], *ordinary])))
        elif spec.get('manual'):
            for tier, terms in manual[spec['manual']].items():
                for term in terms.split('|'):
                    word, *aliases = term.split('~')
                    add(word, aliases, TIER[tier])
        else:
            result['all'] = True
            records = {norm(a[0]): a for a in parent['answers']}

        # Explicit review aliases can join canonical answers but cannot silently
        # introduce an out-of-scope answer or count aliases as extra concepts.
        if spec['id'] == 'car-models':
            for key, row in list(records.items()):
                short = re.sub(r'^(?:SEAT|Volkswagen|Renault|Peugeot|Citroën|Ford|Toyota|Opel|BMW|Mercedes-Benz)\s+', '', row[0], flags=re.I)
                if short != row[0]:
                    records[key] = [row[0], sorted(set([*row[1], short])), *row[2:]]
                    record_aliases[norm(short)] = key
        for term in review.get(spec['id'], {}).get('additions', []):
            word, *aliases = term.split('~')
            add(word, aliases)
        overrides = {norm(k): v for k, v in review.get(spec['id'], {}).get('scores', {}).items()}
        for key, row in list(records.items()):
            score = next((overrides[norm(v)] for v in [row[0], *row[1]] if norm(v) in overrides), None)
            if score is not None:
                records[key] = [row[0], row[1], score, 'editorial-2026', None, None, None]
        for term in review.get(spec['id'], {}).get('aliases', []):
            word, *aliases = term.split('~')
            key = norm(word)
            if key not in records:
                raise RuntimeError(f'Review alias has no canonical answer: {spec["id"]}: {word}')
            row = records[key]
            records[key] = [row[0], sorted(set([*row[1], *aliases])), *row[2:]]

        resolved[spec['id']] = records
        if len(records) < 100:
            deferred.append({'id': spec['id'], 'count': len(records), 'reason': 'Fewer than 100 independently sourced canonical concepts; not published.'})
            print(f'DEFERRED {spec["id"]}: {len(records)}', flush=True)
            continue
        if not any(a[2] == 100 for a in records.values()):
            # A transparent editorial gem among unknown/least familiar answers.
            # This changes the band, never fabricates a measurement or name.
            highest = max(r[2] for r in records.values())
            candidates = [a for a in records.values() if a[2] == highest]
            chosen = min(candidates, key=lambda a: (a[4] or 0, norm(a[0])))
            records[norm(chosen[0])] = [chosen[0], chosen[1], 100, 'editorial-2026', None, None, None]
            result.pop('all', None)
        if not result.get('all'):
            refs, additions = [], []
            parent_rows = {norm(a[0]): a for a in parent['answers']} if parent else {}
            for key, row in sorted(records.items()):
                if row == parent_rows.get(key):
                    refs.append(key)
                else:
                    additions.append(row)
            if parent:
                result['refs'] = refs
            if additions:
                result['answers'] = additions
        result['count'] = len(records)
        if spec.get('manual'):
            result['hint'] = 'Muebles, sin aparatos eléctricos.' if spec['manual'] == 'furniture' else 'Aparatos eléctricos del hogar: cocina, limpieza, climatización, cuidado personal y entretenimiento.'
        compiled.append(result)
        print(f'{result["id"]}: {len(records)}', flush=True)

    # Explicit subset relations, independent of the parent used for scoring.
    # A philosopher may reuse evidence from a scientist's name without becoming
    # a scientist. Conversely, a French film must also work in "name a film".
    upward = {
        'actors': [q['id'] for q in specs if q['id'].startswith('actors-')] + ['voice-actors'],
        'films': [q['id'] for q in specs if q['id'].startswith('films-')],
        'series': [q['id'] for q in specs if q['id'].startswith('series-')],
        'books': ['novels', 'poetry', 'plays'],
        'scientists': ['physicists', 'mathematicians', 'chemists'],
        'writers': ['writers-spain'],
        'health': ['cancers', 'infections', 'mental-health', 'neurology', 'circulation', 'respiratory', 'digestive', 'skin', 'musculoskeletal'],
        'cities': [q['id'] for q in specs if q['id'].startswith('cities-')],
        'spanish-towns': [q['id'] for q in specs if q['id'].startswith('towns-')],
        'football-clubs': ['spanish-clubs'],
        'mammals': ['dog-breeds'], 'birds': ['ducks', 'parrots'], 'fish': ['sharks'],
        'invertebrates': ['butterflies'], 'plants': ['trees', 'flowers', 'palms'],
        'materials': ['minerals'], 'market': ['menu', 'desserts', 'spanish-food', 'cheeses', 'breads', 'pasta'],
        'drinks': ['cocktails']
    }
    for identity, children in upward.items():
        records = resolved[identity]
        alias_index = {}
        for key, row in records.items():
            for name in [row[0], *row[1]]:
                alias_index.setdefault(norm(name), key)
        for child in children:
            for key, row in resolved.get(child, {}).items():
                found = key if key in records else next((alias_index[norm(a)] for a in [row[0], *row[1]] if norm(a) in alias_index), None)
                if found:
                    old = records[found]
                    names = sorted(a for a in set([*old[1], *row[1], *([row[0]] if norm(row[0]) != norm(old[0]) else [])]) if norm(a) != norm(old[0]))
                    records[found] = [old[0], names, *old[2:]]
                    key = found
                else:
                    records[key] = row
                for name in [row[0], *row[1]]:
                    alias_index.setdefault(norm(name), key)
        result = next(q for q in compiled if q['id'] == 'q4-' + identity)
        result.pop('all', None)
        result.pop('answers', None)
        spec = next(q for q in specs if q['id'] == identity)
        parent = parents[spec['parent']]
        original = {norm(a[0]): a for a in parent['answers']}
        refs, additions = [], []
        for key, row in sorted(records.items()):
            if row == original.get(key):
                refs.append(key)
            else:
                additions.append(row)
        result.update(refs=refs, count=len(records))
        if additions:
            result['answers'] = additions
    packs = collections.Counter(q['pack'] for q in compiled)
    if any(packs[p] < 7 for p in ['everyday', 'nature', 'words', 'spain', 'science', 'culture', 'world']):
        raise RuntimeError(f'Each themed mission needs at least seven prompts: {packs}')
    source_hashes = {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest() for name in ['content/focused-questions.json', 'content/focused-review.json', 'content/imported-focused-memberships.json', 'content/manual-focused-20261020.json', 'content/focused-source-manifest.json', 'dist/repertory.json'] if (ROOT / name).exists()}
    output = {'version': VERSION, 'checked': '2026-10-20', 'parentRevision': bank['coverageRevision'], 'minimumAnswers': 100, 'actorCount': len(resolved['actors']), 'sourceHashes': source_hashes, 'questions': compiled}
    (ROOT / 'dist/focused-repertory.json').write_text(json.dumps(output, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    audit = {'version': VERSION, 'checked': '2026-10-20', 'questions': [], 'deferred': deferred}
    previous_audit = {q['id']: q for q in read('content/category-source-audit.json')['questions']}
    for q in compiled:
        spec = next(s for s in specs if 'q4-' + s['id'] == q['id'])
        sources = ['https://es.wikipedia.org/wiki/Categoría:' + urllib.parse.quote(c.replace(' ', '_')) for c in spec.get('categories', [])]
        if spec.get('geo'):
            sources.append('https://download.geonames.org/export/dump/readme.txt')
        elif spec.get('icdPrefixes'):
            sources.append('https://www.sanidad.gob.es/estadEstudios/estadisticas/normalizacion/CIE10/2026/Diagnosticos_Tabla_Referencia_CIE10ES_2026.xlsx')
        elif spec.get('manual'):
            sources += ['https://es.wikipedia.org/wiki/Electrodoméstico' if spec['manual'] == 'appliances' else 'https://es.wikipedia.org/wiki/Mobiliario', 'https://dle.rae.es/']
        elif not sources:
            sources += previous_audit[spec['parent']]['sources']
        sources += review.get(spec['id'], {}).get('sources', [])
        audit['questions'].append({'id': q['id'], 'count': q['count'], 'sources': sources, 'rarity': 'Inherited Spain evidence where available; explicitly identified editorial estimates otherwise.'})
    audited = {q['id']: q for q in audit['questions']}
    for identity, children in upward.items():
        entry = audited['q4-' + identity]
        entry['includesReviewedSubsets'] = children
        sources = list(entry['sources'])
        for child in children:
            if 'q4-' + child in audited:
                sources += audited['q4-' + child]['sources']
            else:
                child_spec = next((s for s in specs if s['id'] == child), {})
                sources += ['https://es.wikipedia.org/wiki/Categoría:' + urllib.parse.quote(c.replace(' ', '_')) for c in child_spec.get('categories', [])]
                sources += review.get(child, {}).get('sources', [])
        entry['sources'] = list(dict.fromkeys(sources))
    (ROOT / 'content/focused-source-audit.json').write_text(json.dumps(audit, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    # This catalogue is a date-version contract. Subsequent expansions must add a
    # FUTURE edition, retaining existing pools and dates byte for byte.
    daily_path = ROOT / 'dist/daily-catalog.js'
    if not daily_path.exists() or daily_path.read_text(encoding='utf-8').startswith('// DRAFT'):
        editions = [{'from': '0000-01-01', 'version': bank['version'], 'pool': [[q['id'], q['pack']] for q in bank['questions']]}, {'from': '2026-10-21', 'version': VERSION, 'pool': [[q['id'], q['pack']] for q in compiled]}]
        daily_path.write_text(('// DRAFT: unpublished daily catalogue.\n' if args.preview else '// Immutable daily editions. Add future editions; never alter published pools.\n') + 'export const DAILY_EDITIONS = ' + json.dumps(editions, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8', newline='\n')
    print(f'Published {len(compiled)} questions; {sum(q["count"] for q in compiled)} canonical answer slots; packs: {dict(packs)}', flush=True)


if __name__ == '__main__':
    main()
