"""Resolve familiar work titles, redirects and explicitly published categories.

Use article metadata to place the same work in its country/decade/genre subsets.
Do not infer a work's country from its language, title or a same-named film.
"""
import concurrent.futures
import hashlib
import importlib.util
import json
import pathlib
import re
import unicodedata
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('coverage', ROOT / 'scripts/import-coverage.py')
coverage = importlib.util.module_from_spec(spec)
spec.loader.exec_module(coverage)
GENRES = {'animation': 'animación', 'horror': 'terror', 'science-fiction': 'ciencia ficción', 'comedy': 'comedia', 'fantasy': 'fantasía', 'action': 'acción', 'thriller': 'suspenso', 'musical': 'musicales'}
COUNTRIES = {'spain': 'España', 'france': 'Francia', 'italy': 'Italia', 'japan': 'Japón', 'mexico': 'México', 'argentina': 'Argentina', 'usa': 'Estados Unidos'}


def norm(text):
    text = text.lower().replace('ñ', '~')
    text = ''.join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn').replace('~', 'ñ')
    return ' '.join(re.sub('[^a-zñ0-9 ]', ' ', text).split())


def fetch(titles):
    params = {'action': 'query', 'format': 'json', 'utf8': 1, 'redirects': 1, 'titles': '|'.join(titles), 'prop': 'categories|redirects', 'cllimit': 500, 'clshow': '!hidden', 'rdlimit': 500, 'rdnamespace': 0}
    pages, seen = {}, set()
    while True:
        url = 'https://es.wikipedia.org/w/api.php?' + urllib.parse.urlencode(params)
        raw = coverage.download('work-meta-' + hashlib.sha256(url.encode()).hexdigest()[:20] + '.json', url)
        response = json.loads(raw)
        if response.get('error'):
            raise RuntimeError(response['error'])
        for p in response.get('query', {}).get('pages', {}).values():
            if p.get('missing') is not None or p.get('ns') != 0:
                continue
            row = pages.setdefault(p['pageid'], {'title': p['title'], 'categories': set(), 'aliases': set()})
            row['categories'].update(c['title'].removeprefix('Categoría:') for c in p.get('categories', []))
            row['aliases'].update(r['title'] for r in p.get('redirects', []))
        continuation = response.get('continue')
        if not continuation:
            return list(pages.values())
        token = json.dumps(continuation, sort_keys=True)
        if token in seen:
            raise RuntimeError('Repeated work metadata continuation')
        seen.add(token)
        params.update(continuation)


def scopes(categories):
    targets = set()
    if any(c.startswith('Películas ') for c in categories):
        targets.add('films')
        for key, value in GENRES.items():
            if any(c.startswith('Películas de ' + value) or key == 'comedy' and c.startswith('Películas cómicas') or key == 'musical' and c.startswith('Películas musicales') for c in categories):
                targets.add('films-' + key)
        for key, value in COUNTRIES.items():
            if any(c == 'Películas de ' + value or c.startswith('Películas de ' + value + ' ') for c in categories):
                targets.add('films-' + key)
        for c in categories:
            year = re.fullmatch(r'Películas(?: de .+)? de (19\d{2}|20\d{2})', c)
            if year and 1980 <= int(year[1]) <= 2026:
                targets.add('films-' + str(int(year[1]) // 10 * 10))
    if any(c.startswith('Series de televisión ') or c.startswith('Series de anime') for c in categories):
        targets.add('series')
        if any(c.startswith('Series de televisión animadas') or c.startswith('Series de anime') for c in categories):
            targets.add('series-animation')
        for key, value in {'comedy': 'comedia', 'scifi': 'ciencia ficción', 'spanish': 'España'}.items():
            if any(c.startswith('Series de televisión de ' + value) for c in categories):
                targets.add('series-' + key)
    if any(c.startswith('Novelas ') for c in categories):
        targets.update(['books', 'novels'])
    return targets


def public_json(base, params):
    url = base + '?' + urllib.parse.urlencode(params)
    return json.loads(coverage.download('work-meta-' + hashlib.sha256(url.encode()).hexdigest()[:20] + '.json', url))


def film_items(titles):
    response = public_json('https://es.wikipedia.org/w/api.php', {'action': 'query', 'format': 'json', 'redirects': 1, 'titles': '|'.join(titles), 'prop': 'pageprops', 'ppprop': 'wikibase_item'})
    return {r['title']: r['pageprops']['wikibase_item'] for r in response.get('query', {}).get('pages', {}).values() if r.get('pageprops', {}).get('wikibase_item')}


def release_years(items):
    response = public_json('https://www.wikidata.org/w/api.php', {'action': 'wbgetentities', 'format': 'json', 'ids': '|'.join(items), 'props': 'claims'})
    result = {}
    for key, entity in response.get('entities', {}).items():
        years = []
        for claim in entity.get('claims', {}).get('P577', []):
            if claim.get('rank') == 'deprecated':
                continue
            value = claim.get('mainsnak', {}).get('datavalue', {}).get('value', {})
            match = re.match(r'^\+(\d{4})-', value.get('time', ''))
            if match and value.get('precision', 0) >= 9 and 1888 <= int(match[1]) <= 2100:
                years.append(int(match[1]))
        if years:
            result[key] = min(years)
    return result


def main():
    review = json.loads((ROOT / 'content/expanded-review.json').read_text(encoding='utf-8'))
    cases = json.loads((ROOT / 'tests/focused-cases.json').read_text(encoding='utf-8'))
    titles = {term.split('~')[0] for key in ['films', 'series', 'books'] for term in review[key]['additions']}
    titles.update(word for key, value in cases.items() if key.startswith(('films-', 'series-')) or key == 'novels' for word in value.split('|'))
    ordered = sorted(titles)
    records = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        for rows in executor.map(fetch, [ordered[i:i + 40] for i in range(0, len(ordered), 40)]):
            for row in rows:
                old = records.setdefault(row['title'], {'title': row['title'], 'categories': set(), 'aliases': set()})
                old['categories'].update(row['categories'])
                old['aliases'].update(row['aliases'])
            print(f'{len(records)} resolved titles', flush=True)
    memberships = {}
    movies = sorted(row['title'] for row in records.values() if 'films' in scopes(row['categories']))
    movie_items, years = {}, {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        for part in executor.map(film_items, [movies[i:i + 40] for i in range(0, len(movies), 40)]):
            movie_items.update(part)
        ids = sorted(set(movie_items.values()))
        for part in executor.map(release_years, [ids[i:i + 35] for i in range(0, len(ids), 35)]):
            years.update(part)
    manual_aliases = {kind: {norm(term.split('~')[0]): term.split('~') for term in review[kind]['additions']} for kind in ['films', 'series', 'books']}
    for row in records.values():
        targets = scopes(row['categories'])
        if not targets:
            continue
        year = years.get(movie_items.get(row['title']))
        if year is not None:
            targets = {t for t in targets if not re.fullmatch(r'films-\d{4}', t)}
            if 1980 <= year <= 2026:
                targets.add('films-' + str(year // 10 * 10))
        word = re.sub(r' \([^)]*\)$', '', row['title'])
        labels = row['aliases'] | {row['title'], word}
        names = set(labels)
        for kind in targets & manual_aliases.keys():
            for label in labels:
                names.update(manual_aliases[kind].get(norm(label), []))
        aliases = sorted(a for a in names if a != word and len(a) <= 100 and not a.startswith(('Anexo:', 'Categoría:')))
        entry = {'word': word, 'aliases': aliases, 'article': row['title']}
        if year is not None:
            entry.update(releaseYear=year, wikidata=movie_items[row['title']])
        for target in targets:
            memberships.setdefault(target, []).append(entry)
    output = {'checked': '2026-10-20', 'source': 'https://www.mediawiki.org/wiki/API:Categories', 'memberships': {k: sorted(v, key=lambda r: r['article']) for k, v in sorted(memberships.items())}}
    (ROOT / 'content/imported-work-coverage.json').write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    manifest = {r['file']: r for r in coverage.helpers.MANIFEST}
    (ROOT / 'content/work-source-manifest.json').write_text(json.dumps([manifest[k] for k in sorted(manifest)], ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    print({k: len(v) for k, v in memberships.items()}, flush=True)


if __name__ == '__main__':
    main()
