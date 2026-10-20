"""Coverage from public Wikipedia category memberships and GeoNames, checked in 2026."""
import csv
import argparse
import io
import json
import pathlib
import urllib.parse
import zipfile
import importlib.util

helper_spec = importlib.util.spec_from_file_location('repertory_sources', pathlib.Path(__file__).with_name('import-repertory-sources.py'))
helpers = importlib.util.module_from_spec(helper_spec)
helper_spec.loader.exec_module(helpers)
ROOT, CACHE, download = helpers.ROOT, helpers.CACHE, helpers.download

CATEGORIES = {
 'films': [f'Películas de {year}' for year in sorted({1972, 1977, 1984, 1994, 1997, 1999, 2000, 2001, *range(2010, 2027)})],
 'series': [f'Series de televisión iniciadas en {year}' for year in sorted({1990, 1994, 2000, 2005, *range(2010, 2027)})],
 'actors': ['Actores de cine de Estados Unidos', 'Actrices de cine de Estados Unidos', 'Actores de cine de España', 'Actrices de cine de España', 'Actores de cine de Francia', 'Actrices de cine de Francia', 'Actores de cine de México', 'Actrices de cine de México', 'Actores de cine de Inglaterra', 'Actrices de cine de Inglaterra', 'Actores de cine de Escocia', 'Actrices de cine de Escocia', 'Actores de cine de Gales', 'Actrices de cine de Gales', 'Actores de cine de Irlanda', 'Actrices de cine de Irlanda', 'Actores de cine de Canadá', 'Actrices de cine de Canadá', 'Actores de cine de Australia', 'Actrices de cine de Australia', 'Actores de cine de Argentina', 'Actrices de cine de Argentina', 'Actores de cine de Italia', 'Actrices de cine de Italia', 'Actores de cine de India', 'Actrices de cine de India', 'Actores de cine de Japón', 'Actrices de cine de Japón', 'Actores de cine de Corea del Sur', 'Actrices de cine de Corea del Sur'],
 'musicians': ['Cantantes masculinos de Estados Unidos', 'Cantantes femeninas de Estados Unidos', 'Cantantes de España', 'Cantantes de Argentina', 'Cantantes de México', 'Cantantes de Reino Unido'],
 'bands': ['Grupos de rock de Estados Unidos', 'Grupos de rock de España', 'Grupos de pop de Reino Unido', 'Grupos de rock de Inglaterra', 'Grupos de heavy metal de Alemania'],
 'books': [f'Novelas de {year}' for year in sorted({1850, 1860, 1900, 1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2005, *range(2010, 2027)})],
 'characters': ['Personajes de Marvel Comics', 'Personajes de DC Comics', 'Personajes de Harry Potter', 'Personajes de Los Simpson', 'Personajes de Star Wars', 'Personajes de Dragon Ball', 'Personajes de El Señor de los Anillos', 'Personajes de videojuegos'],
 'videogames': [f'Videojuegos de {year}' for year in sorted({1985, 1986, 1990, 1995, 2000, 2001, 2004, 2005, 2008, 2009, *range(2010, 2027)})],
 'scientists': ['Físicos de Alemania del siglo XX', 'Físicos de Estados Unidos del siglo XX', 'Científicos de España del siglo XX', 'Matemáticos del siglo XX', 'Químicos de Francia', 'Biólogos del siglo XX'],
 'writers': ['Escritores de España del siglo XX', 'Escritores de Estados Unidos del siglo XX', 'Escritores de Francia del siglo XX', 'Escritores de Argentina del siglo XX', 'Escritores de Reino Unido del siglo XX'],
 'clubs': ['Equipos de la Premier League', 'Equipos de la Primera División de España', 'Equipos de la Segunda División de España', 'Equipos de fútbol de Brasil', 'Equipos de la Serie A', 'Equipos de la Bundesliga', 'Equipos de fútbol de Argentina'],
 'spanish-clubs': ['Equipos de la Primera División de España', 'Equipos de la Segunda División de España', 'Equipos de la Segunda División B de España', 'Equipos de la Tercera División de España', 'Equipos de la Primera Federación'],
 'spanish-artists': ['Actores de cine de España', 'Escritores de España del siglo XX', 'Pintores de España del siglo XX', 'Directores de cine de España', 'Cantantes de España'],
 'directors': ['Directores de cine de Estados Unidos', 'Directores de cine de España', 'Directores de cine de Francia', 'Directores de cine de Reino Unido', 'Directores de cine de Italia'],
}

def category_members(title):
    params = {'action': 'query', 'format': 'json', 'list': 'categorymembers', 'cmtitle': 'Categoría:' + title, 'cmlimit': '500', 'cmnamespace': '0'}
    import hashlib
    members, seen = {}, set()
    while True:
        url = 'https://es.wikipedia.org/w/api.php?' + urllib.parse.urlencode(params)
        key = hashlib.sha256(url.encode()).hexdigest()[:18]
        data = json.loads(download(f'v3-category-{key}.json', url))
        if 'error' in data:
            raise RuntimeError(data['error'])
        for page in data.get('query', {}).get('categorymembers', []):
            members[page['pageid']] = page
        continuation = data.get('continue')
        if not continuation:
            return list(members.values())
        token = json.dumps(continuation, sort_keys=True)
        if token in seen:
            raise RuntimeError(f'Repeated continuation for {title}')
        seen.add(token)
        params.update(continuation)

def category_sources(selected=None):
    for name, categories in CATEGORIES.items():
        if selected and name not in selected:
            continue
        records = {}
        path = CACHE / f'v3-named-{name}.json'
        if path.exists():
            for row in json.loads(path.read_text(encoding='utf-8'))['results']['bindings']:
                records[row['name']['value']] = row
        for category in categories:
            for page in category_members(category):
                title = page['title']
                if title.startswith(('Anexo:', 'Historia de ', 'Lista de ', 'Personajes de ', 'Categoría:', 'Cine de ')):
                    continue
                records[title] = {'item': {'value': f'https://es.wikipedia.org/?curid={page["pageid"]}'}, 'name': {'value': title}}
        data = {'results': {'bindings': [records[title] for title in sorted(records)]}}
        path.write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')
        print(f'{name}: {len(records)} coverage records', flush=True)

def geonames():
    cities = download('cities15000.zip', 'https://download.geonames.org/export/dump/cities15000.zip')
    spain = download('geonames-ES.zip', 'https://download.geonames.org/export/dump/ES.zip')
    all_cities, localities, features = [], [], []
    def rows(name, member):
        with zipfile.ZipFile(CACHE / name) as archive:
            for line in archive.read(member).decode('utf-8').splitlines():
                parts = line.split('\t')
                if len(parts) >= 19:
                    yield parts
    for row in rows('cities15000.zip', 'cities15000.txt'):
        if row[7] == 'PPLX':
            continue
        all_cities.append({'word': row[1], 'aliases': [row[2]], 'id': row[0], 'country': row[8], 'population': int(row[14] or '0'), 'modified': row[18]})
    all_cities.sort(key=lambda r: -r['population'])
    for row in rows('geonames-ES.zip', 'ES.txt'):
        item = {'word': row[1], 'aliases': [row[2]], 'id': row[0], 'country': 'ES', 'population': int(row[14] or '0'), 'modified': row[18]}
        if row[6] == 'P' and row[7] not in ('PPLX', 'PPLQ', 'PPLW'):
            localities.append(item)
        if row[7] in ('STM', 'LK', 'LKS', 'MT', 'MTS', 'PK', 'VLC', 'DESRT'):
            features.append(item)
    localities.sort(key=lambda r: -r['population'])
    result = {'cities': all_cities[:10000], 'municipalities': localities[:12000], 'spanish-geography': features[:5000], 'geography': features[:600]}
    (CACHE / 'v3-geonames.json').write_text(json.dumps(result, ensure_ascii=False), encoding='utf-8')
    print('GeoNames coverage:', {k: len(v) for k, v in result.items()}, flush=True)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--only', nargs='+', choices=sorted(CATEGORIES))
    args = parser.parse_args()
    category_sources(set(args.only) if args.only else None)
    if not args.only:
        geonames()
    manifest_path = CACHE / 'v3-coverage-manifest.json'
    previous = json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else []
    merged = {row['file']: row for row in previous + helpers.MANIFEST}
    manifest_path.write_text(json.dumps(list(merged.values()), ensure_ascii=False, indent=2), encoding='utf-8')
