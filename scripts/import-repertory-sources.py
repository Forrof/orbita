"""Public coverage sources. Worldwide entity metadata never becomes a Spain statistic."""
import hashlib
import json
import pathlib
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
CACHE = ROOT / '.cache'
CACHE.mkdir(exist_ok=True)
HEADERS = {'User-Agent': 'OrbitaGame/3.0 (public educational game; dataset curation)', 'Accept': 'application/json'}
MANIFEST = []


def download(name, url):
    path = CACHE / name
    if not path.exists():
        for attempt in range(4):
            try:
                request = urllib.request.Request(url, headers=HEADERS)
                with urllib.request.urlopen(request, timeout=55) as response:
                    body = response.read()
                path.write_bytes(body)
                break
            except urllib.error.HTTPError as error:
                if error.code not in (429, 503) or attempt == 3:
                    raise
                time.sleep(max(int(error.headers.get('Retry-After', '5')), 5 * (attempt + 1)))
        time.sleep(.85)
    body = path.read_bytes()
    MANIFEST.append({'file': name, 'url': url, 'sha256': hashlib.sha256(body).hexdigest()})
    return body


NAMED = {'footballers': ('?item wdt:P106 wd:Q937857.', 1800)}


def named_sources():
    # All other entity families use the faster public category API in import-coverage.py.
    for name, (where, limit) in [('footballers', NAMED['footballers'])]:
        # This query supplies membership, never a popularity or rarity ranking.
        # Well-known anchor answers are curated separately so a query limit cannot exclude Messi.
        query = f'''SELECT ?item ?name WHERE {{ {where}
          ?article schema:about ?item; schema:isPartOf <https://es.wikipedia.org/>; schema:name ?name.
        }} LIMIT {limit}'''
        url = 'https://query.wikidata.org/sparql?' + urllib.parse.urlencode({'query': query, 'format': 'json'})
        body = download(f'v3-named-{name}.json', url)
        result = json.loads(body)['results']['bindings']
        if len(result) < 100:
            raise RuntimeError(f'{name}: only {len(result)} records; review the source instead of padding it.')
        print(f'{name}: {len(result)} source entities', flush=True)
    (CACHE / 'v3-source-manifest.json').write_text(json.dumps(MANIFEST, ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == '__main__':
    named_sources()
