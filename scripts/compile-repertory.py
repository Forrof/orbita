"""Compile reviewed questions; fail if any has fewer than 100 distinct answer names."""
import bisect
import collections
import hashlib
import json
import pathlib
import re
import sys
import unicodedata

ROOT = pathlib.Path(__file__).resolve().parent.parent
CACHE = ROOT / '.cache'
sys.path.insert(0, str(CACHE / 'python-tools'))
VERSION = '2026-10-19.3'
TIER = {'common': 10, 'familiar': 30, 'rare': 60, 'deep': 85, 'gem': 100}
LATIN_VARIANTS = str.maketrans({'ø': 'o', 'Ø': 'O', 'ł': 'l', 'Ł': 'L', 'đ': 'd', 'Đ': 'D', 'ð': 'd', 'Ð': 'D', 'þ': 'th', 'Þ': 'Th', 'æ': 'ae', 'Æ': 'Ae', 'œ': 'oe', 'Œ': 'Oe', 'ß': 'ss', 'ı': 'i'})

def read(path):
    return json.loads(path.read_text(encoding='utf-8'))

def norm(word):
    word = word.lower().replace('ñ', '~')
    word = ''.join(c for c in unicodedata.normalize('NFD', word) if unicodedata.category(c) != 'Mn').replace('~', 'ñ')
    return ' '.join(re.sub('[^a-zñ0-9 ]', ' ', word).split())

data = read(ROOT / 'dist/data.json')
questions = read(ROOT / 'content/questions.json')
seeds = read(ROOT / 'content/seed-pools.json')
geonames = read(CACHE / 'v3-geonames.json')
current = read(CACHE / 'current-interest-2026.json')
recognition = {norm(word): (word, percent, sample) for word, percent, sample in data['spainNorms']}
noun_forms = collections.defaultdict(set)
attested_forms = {}
for word, pos, index in data['forms']:
    if set(pos.split('|')) & {'n', 'adj'}:
        attested_forms[norm(word)] = word
    if 'n' in pos.split('|'):
        noun_forms[norm(data['spainNorms'][index][0])].add(word)
signals = {norm(r['title']): r for r in current['entries'] if r['daysListed'] >= 3}
signal_values = sorted(r['publishedViews'] for r in signals.values())
manual = {}
for file in sorted((ROOT / 'content').glob('manual-*.json')):
    pools = read(file)
    duplicate = set(manual) & set(pools)
    if duplicate:
        raise RuntimeError(f'Duplicate editorial pool names: {duplicate}')
    manual.update(pools)

def attested_variants(word, gender=False):
    """Accept regular forms only when independently attested; do not guess words."""
    if ' ' in word:
        return set()
    stems = {word}
    if gender:
        for suffix, replacement in [('o', 'a'), ('or', 'ora'), ('án', 'ana'), ('és', 'esa'), ('ín', 'ina'), ('ón', 'ona'), ('z', 'za')]:
            if word.endswith(suffix):
                stems.add(word[:-len(suffix)] + replacement)
    candidates = set(stems)
    for stem in stems:
        candidates.add(stem + ('s' if stem[-1:].lower() in 'aeiouáéíóú' else 'es'))
        if stem.endswith('z'):
            candidates.add(stem[:-1] + 'ces')
    return {attested_forms[norm(s)] for s in candidates if norm(s) in attested_forms}

def historical_score(value):
    return 10 if value >= 98 else 30 if value >= 90 else 60 if value >= 65 else 85 if value >= 35 else 100

def interest_score(count):
    rank = 1 - bisect.bisect_right(signal_values, count) / max(1, len(signal_values))
    return 10 if rank < .12 else 30 if rank < .45 else 60 if rank < .78 else 85

def ine_names():
    import openpyxl
    result = collections.defaultdict(int)
    workbook = openpyxl.load_workbook(CACHE / 'ine-nombres.xlsx', read_only=True, data_only=True)
    for sheet in workbook:
        for row in sheet.iter_rows(min_row=8, values_only=True):
            if isinstance(row[0], (int, float)) and isinstance(row[1], str) and isinstance(row[2], (int, float)):
                result[row[1].strip().title()] += int(row[2])
    return [{'word': w, 'aliases': [], 'count': n, 'basis': 'ine-names-2026'} for w, n in result.items() if n >= 20]

def ine_surnames():
    import xlrd
    workbook = xlrd.open_workbook(str(CACHE / 'ine-apellidos.xls'))
    result = []
    for sheet in workbook.sheets():
        for index in range(5, sheet.nrows):
            row = sheet.row_values(index)
            if isinstance(row[0], (int, float)) and isinstance(row[1], str) and isinstance(row[2], (int, float)):
                result.append({'word': row[1].strip().title(), 'aliases': [], 'count': int(row[2]), 'basis': 'ine-surnames-2026'})
    return result

named_cache = {}
source_exclusions = read(ROOT / 'content/focused-source-exclusions.json')
def named_entries(kind):
    if kind == 'first-names':
        return ine_names()
    if kind == 'surnames':
        return ine_surnames()
    result = []
    for part in kind.split('+'):
        if part in geonames:
            result.extend({**r, 'source': 'geonames'} for r in geonames[part])
        else:
            path = CACHE / f'v3-named-{part}.json'
            if not path.exists():
                raise RuntimeError(f'Missing coverage source: {part}')
            for row in read(path)['results']['bindings']:
                title = row['name']['value']
                if title in source_exclusions.get(part, []):
                    continue
                if part == 'films' and re.search(r'\((?:álbum|canción|miniserie|serie de televisión|videojuego|musical)\)', title, re.I):
                    continue
                simple = re.sub(r' \([^)]*\)$', '', title)
                result.append({'word': simple, 'aliases': [title] if title != simple else [], 'article': title, 'source': 'wikimedia-coverage'})
    return result

def build(spec):
    identity, pack, text, roots, seed_names, extras, *tail = spec
    kind = tail[0] if tail else None
    if kind == 'dictionary':
        return {'id': 'q3-' + identity, 'pack': pack, 'text': text, 'dictionary': True, 'hint': 'Se admiten palabras y flexiones documentadas. Rareza editorial de 2026 con referencia histórica identificada.'}
    is_named = bool(kind) or identity in ('countries', 'brands')
    records, aliases = [], {}
    def add(entry, score=None, priority=0):
        word = entry['word'].strip()
        if not norm(word) or re.search('[\u0400-\u04ff]', word):
            return
        variants = list(dict.fromkeys([word] + entry.get('aliases', [])))
        variants = list(dict.fromkeys(variants + [v.translate(LATIN_VARIANTS) for v in variants]))
        keys = {norm(w) for w in variants if norm(w)}
        matched = list({id(aliases[k]): aliases[k] for k in keys if k in aliases}.values())
        row = matched[0] if matched else {'word': word, 'aliases': set(), 'priority': -1, 'source': entry.get('source', 'editorial')}
        if not matched:
            records.append(row)
        for other in matched[1:]:
            row['aliases'].update(other['aliases'])
            row['aliases'].add(other['word'])
            for a in [other['word'], *other['aliases']]:
                aliases[norm(a)] = row
            if other in records:
                records.remove(other)
        row['aliases'].update(variants)
        if priority >= row['priority']:
            row['aliases'].add(row['word'])
            row.update({k: v for k, v in entry.items() if k not in ('aliases',)})
            row['priority'] = priority
            if score is not None:
                row['manualScore'] = score
        for key in keys:
            aliases[key] = row
    # Ontology roots in the specification are research notes, not an approval rule.
    # Only explicit reviewed Spanish vocabulary is admitted, never whole translated subtrees.
    if identity == 'health':
        for entry in read(ROOT / 'content/imported-health-2026.json')['entries']:
            variants = [entry['word'], *entry['aliases']]
            # Ordinary Spanish permits the article-free compound form, e.g.
            # "fractura de fémur" alongside the official "fractura del fémur".
            ordinary = [re.sub(r'\b(?:de la|de las|de los|del)\b', 'de', name, flags=re.I) for name in variants]
            add({**entry, 'aliases': list(dict.fromkeys([*entry['aliases'], *ordinary]))}, score=entry['score'], priority=0)
    for seed in seed_names:
        if seed not in seeds:
            raise RuntimeError(f'Missing seed pool: {seed}')
        for entry in seeds[seed]:
            add(entry, priority=1)
    if kind:
        for entry in named_entries(kind):
            add(entry, priority=2)
    for pool in extras:
        if pool not in manual:
            raise RuntimeError(f'Missing editorial pool: {pool}')
        for tier, terms in manual[pool].items():
            for term in terms.split('|'):
                variants = [w.strip() for w in term.split('~') if w.strip()]
                if variants:
                    add({'word': variants[0], 'aliases': variants[1:], 'source': 'editorial'}, TIER[tier], 3 if tier != 'common' else 4)
    supplemental = ROOT / 'content/aliases.json'
    for term in read(supplemental).get(identity, []):
        variants = [w.strip() for w in term.split('~') if w.strip()]
        found = next((aliases.get(norm(w)) for w in variants if aliases.get(norm(w))), None)
        if found:
            add({'word': found['word'], 'aliases': variants}, priority=-2)
    output = []
    for row in records:
        word = row['word']
        if not is_named:
            forms = set()
            # A preferred label may change after synonym merging. Retain attested
            # inflections of all lexical names, but never inflect symbols like Fe.
            for label in {word, *row['aliases']}:
                if label.islower():
                    forms.update(noun_forms.get(norm(label), set()))
                    forms.update(attested_variants(label, identity in ('jobs', 'demonym')))
            for form in forms:
                if norm(form) not in aliases or aliases[norm(form)] is row:
                    row['aliases'].add(form)
        count = None
        days = None
        history = None
        basis = 'editorial-2026'
        if row.get('basis', '').startswith('ine-'):
            count = row['count']
            score = 10 if count >= 100000 else 30 if count >= 20000 else 60 if count >= 2000 else 85 if count >= 100 else 100
            basis = row['basis']
        elif is_named:
            # A qualified article must match its own signal. A film, novel and series
            # can share a title; borrowing the unqualified page would invent evidence.
            signal = signals.get(norm(row.get('article', word)))
            if signal:
                count, days = signal['publishedViews'], signal['daysListed']
                basis = 'interest-2026'
                score = interest_score(count)
            else:
                score = 85
            if 'manualScore' in row:
                score, basis = row['manualScore'], 'editorial-2026'
                count, days = None, None
        else:
            old = recognition.get(norm(word))
            if old:
                history = [old[1], old[2]]
                score, basis = historical_score(old[1]), 'editorial-historical'
            else:
                score = row.get('manualScore', 85)
            if row.get('manualScore') == 100:
                score, basis = 100, 'editorial-2026'
        other_names = sorted(w for w in row['aliases'] if norm(w) != norm(word))
        output.append({'word': word, 'aliases': other_names, 'score': score, 'basis': basis, 'count': count, 'days': days, 'history': history})
    # Readable surname aliases are accepted only when they identify one candidate in this question.
    if identity in ('footballers', 'actors', 'scientists', 'writers', 'directors', 'spanish-artists', 'music'):
        surname_groups = collections.defaultdict(list)
        for row in output:
            tokens = row['word'].split()
            if len(tokens) >= 2 and len(tokens[-1]) >= 4 and tokens[-1].lower().rstrip('.') not in ('junior', 'júnior', 'jones'):
                last = ' '.join(tokens[-2:]) if len(tokens) >= 3 and tokens[-2].lower() in ('de', 'del', 'van', 'von', 'da', 'dos') else tokens[-1]
                surname_groups[norm(last)].append((row, last))
        for candidates in surname_groups.values():
            if len(candidates) == 1:
                row, last = candidates[0]
                if norm(last) not in aliases:
                    row['aliases'].append(last)
    if len(output) < 100:
        raise RuntimeError(f'{identity}: {len(output)} distinct concepts, below the required 100')
    if not any(r['score'] == 100 for r in output):
        # Editorial selection among the least familiar band; never promote a familiar answer.
        candidates = [r for r in output if r['score'] == max(x['score'] for x in output)]
        chosen = min(candidates, key=lambda r: (r['history'][0] if r['history'] else 0, r['count'] or 0, norm(r['word'])))
        chosen.update(score=100, basis='editorial-2026')
    output.sort(key=lambda r: norm(r['word']))
    packed = [[r['word'], sorted(set(r['aliases'])), r['score'], r['basis'], r['count'], r['days'], r['history']] for r in output]
    return {'id': 'q3-' + identity, 'pack': pack, 'text': text, 'hint': 'Se aceptan nombres habituales, variantes y alias registrados. Cada concepto cuenta una vez.', 'answers': packed}

compiled = []
for spec in questions:
    question = build(spec)
    compiled.append(question)
    print(question['id'], len(question.get('answers', data['forms'] if question.get('dictionary') else [])), flush=True)

# Validity does not require a recognition survey. Reviewed semantic vocabulary
# attested in the source lexicon may have no SPALEX measurement at all.
lexicon = {norm(row[0]) for row in data['lexicon']}
dictionary_keys = {norm(row[0]) for row in data['forms']}
supplement = {}
for question in compiled:
    if question.get('dictionary'):
        continue
    spec = next(s for s in questions if 'q3-' + s[0] == question['id'])
    if len(spec) > 6 or spec[0] == 'countries':
        continue  # Proper names do not become generic dictionary words.
    for answer in question['answers']:
        word = answer[0]
        key = norm(word)
        if ' ' not in word and word == word.lower() and key in lexicon and key not in dictionary_keys:
            if key not in supplement or answer[2] < supplement[key][2]:
                supplement[key] = [word, [], answer[2], answer[3], answer[4], answer[5], answer[6]]
for question in compiled:
    if question.get('dictionary'):
        documented = read(ROOT / 'content/imported-dictionary-coverage.json')
        dict_spec = next(s for s in questions if s[0] == 'dictionary')
        editorial = {}
        for pool in dict_spec[5]:
            for tier, terms in manual[pool].items():
                editorial.update({norm(term): TIER[tier] for term in terms.split('|')})
        for word in documented['words']:
            key = norm(word)
            if key not in dictionary_keys and key not in supplement:
                supplement[key] = [word, [], editorial.get(key, 60), 'editorial-2026', None, None, None]
            elif key in supplement and key in editorial:
                supplement[key][2:4] = [editorial[key], 'editorial-2026']
        question['additions'] = sorted(supplement.values(), key=lambda a: norm(a[0]))

manifests = []
for file in ['v3-source-manifest.json', 'v3-coverage-manifest.json', 'v3-clubs-manifest.json', 'v3-topics-manifest.json']:
    path = CACHE / file
    if path.exists():
        manifests.extend(read(path))
for name in ['ine-nombres.xlsx', 'ine-apellidos.xls', 'current-interest-2026.json', 'v3-named-footballers.json', 'v3-geonames.json']:
    path = CACHE / name
    manifests.append({'file': name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
for path in sorted((ROOT / 'content').glob('*.json')):
    if path.name.startswith(('manual-', 'imported-')) or path.name in ('aliases.json', 'category-source-audit.json', 'focused-source-manifest.json', 'focused-source-exclusions.json'):
        manifests.append({'file': 'content/' + path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'role': 'Coverage and editorial review; not a rarity measurement'})
bank = {'version': VERSION, 'checked': '2026-10-20', 'minimumAnswers': 100, 'interestPeriod': current['period'], 'ine': {'reference': '2025-01-01', 'published': '2026-04-23', 'nameUrl': 'https://www.ine.es/daco/daco42/nombyapel/nombres_por_edad_media.xlsx', 'surnameUrl': 'https://www.ine.es/daco/daco42/nombyapel/apellidos_frecuencia.xls', 'nameRows': 'Frecuencia de nombres, suma de ambos sexos cuando coinciden', 'surnameRows': 'Frecuencia como primer apellido'}, 'sourceManifest': manifests, 'countryDailyHashes': current['hashes'], 'questions': compiled}
bank['coverageRevision'] = '2026-10-20.3'
(ROOT / 'dist/repertory.json').write_text(json.dumps(bank, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(f'Compiled {len(compiled)} different questions with at least 100 distinct answers each.')
