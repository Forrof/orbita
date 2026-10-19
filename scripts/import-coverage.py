"""Coverage from public Wikipedia category memberships and GeoNames, checked in 2026."""
import csv
import io
import json
import pathlib
import urllib.parse
import zipfile
from importlib.machinery import SourceFileLoader

helpers = SourceFileLoader('repertory_sources', str(pathlib.Path(__file__).with_name('import-repertory-sources.py'))).load_module()
ROOT, CACHE, download = helpers.ROOT, helpers.CACHE, helpers.download

CATEGORIES = {
 'films': [f'Películas de {year}' for year in [1972, 1977, 1984, 1994, 1997, 1999, 2000, 2001, 2010, 2020, 2023, 2024, 2025, 2026]],
 'series': [f'Series de televisión iniciadas en {year}' for year in [1990, 1994, 2000, 2005, 2010, 2015, 2020, 2023, 2024, 2025, 2026]],
 'actors': ['Actores de cine de Estados Unidos', 'Actrices de cine de Estados Unidos', 'Actores de cine de España', 'Actores de cine de Francia', 'Actores de cine de México'],
 'musicians': ['Cantantes masculinos de Estados Unidos', 'Cantantes femeninas de Estados Unidos', 'Cantantes de España', 'Cantantes de Argentina', 'Cantantes de México', 'Cantantes de Reino Unido'],
 'bands': ['Grupos de rock de Estados Unidos', 'Grupos de rock de España', 'Grupos de pop de Reino Unido', 'Grupos de rock de Inglaterra', 'Grupos de heavy metal de Alemania'],
 'books': [f'Novelas de {year}' for year in [1850, 1860, 1900, 1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2005, 2010, 2015, 2020, 2023, 2024]],
 'characters': ['Personajes de Marvel Comics', 'Personajes de DC Comics', 'Personajes de Harry Potter', 'Personajes de Los Simpson', 'Personajes de Star Wars', 'Personajes de Dragon Ball', 'Personajes de El Señor de los Anillos', 'Personajes de videojuegos'],
 'videogames': [f'Videojuegos de {year}' for year in [1985, 1990, 1995, 2000, 2005, 2010, 2015, 2020, 2023, 2024, 2025, 2026]],
 'scientists': ['Físicos de Alemania del siglo XX', 'Físicos de Estados Unidos del siglo XX', 'Científicos de España del siglo XX', 'Matemáticos del siglo XX', 'Químicos de Francia', 'Biólogos del siglo XX'],
 'writers': ['Escritores de España del siglo XX', 'Escritores de Estados Unidos del siglo XX', 'Escritores de Francia del siglo XX', 'Escritores de Argentina del siglo XX', 'Escritores de Reino Unido del siglo XX'],
 'clubs': ['Equipos de la Premier League', 'Equipos de la Primera División de España', 'Equipos de la Segunda División de España', 'Equipos de fútbol de Brasil', 'Equipos de la Serie A', 'Equipos de la Bundesliga', 'Equipos de fútbol de Argentina'],
 'spanish-clubs': ['Equipos de la Primera División de España', 'Equipos de la Segunda División de España', 'Equipos de la Segunda División B de España', 'Equipos de la Tercera División de España', 'Equipos de la Primera Federación'],
 'spanish-artists': ['Actores de cine de España', 'Escritores de España del siglo XX', 'Pintores de España del siglo XX', 'Directores de cine de España', 'Cantantes de España'],
 'directors': ['Directores de cine de Estados Unidos', 'Directores de cine de España', 'Directores de cine de Francia', 'Directores de cine de Reino Unido', 'Directores de cine de Italia'],
}

def category_members(title):
    params = {'action': 'query', 'format': 'json', 'list': 'categorymembers', 'cmtitle': 'Categoría:' + title, 'cmlimit': '500', 'cmnamespace': '0'}
    url = 'https://es.wikipedia.org/w/api.php?' + urllib.parse.urlencode(params)
    import hashlib
    key = hashlib.sha256(url.encode()).hexdigest()[:18]
    data = json.loads(download(f'v3-category-{key}.json', url))
    if 'error' in data:
        raise RuntimeError(data['error'])
    return data.get('query', {}).get('categorymembers', [])

def category_sources():
    for name, categories in CATEGORIES.items():
        records = {}
        for category in categories:
            for page in category_members(category):
                title = page['title']
                if title.startswith(('Anexo:', 'Historia de ', 'Lista de ', 'Personajes de ', 'Categoría:', 'Cine de ')):
                    continue
                records[page['pageid']] = {'item': {'value': f'https://es.wikipedia.org/?curid={page["pageid"]}'}, 'name': {'value': title}}
        path = CACHE / f'v3-named-{name}.json'
        # Preserve the earlier verified Wikidata catalogue if a category taxonomy is too sparse.
        if path.exists():
            for row in json.loads(path.read_text(encoding='utf-8'))['results']['bindings']:
                records[row['name']['value']] = row
        data = {'results': {'bindings': list(records.values())}}
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
    result = {'cities': all_cities[:2500], 'municipalities': localities[:2000], 'spanish-geography': features[:1200], 'geography': features[:600]}
    (CACHE / 'v3-geonames.json').write_text(json.dumps(result, ensure_ascii=False), encoding='utf-8')
    print('GeoNames coverage:', {k: len(v) for k, v in result.items()}, flush=True)

if __name__ == '__main__':
    category_sources()
    geonames()
    (CACHE / 'v3-coverage-manifest.json').write_text(json.dumps(helpers.MANIFEST, ensure_ascii=False, indent=2), encoding='utf-8')
