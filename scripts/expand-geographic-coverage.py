"""Retain the full downloaded city/locality/feature registers, not a top-N sample.

Population only orders source coverage. It never supplies game rarity points.
"""
import json
import pathlib
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
CACHE = ROOT / '.cache'


def rows(name, member):
    with zipfile.ZipFile(CACHE / name) as archive:
        for line in archive.read(member).decode('utf-8').splitlines():
            row = line.split('\t')
            if len(row) >= 19:
                yield row


def item(row):
    return {'word': row[1], 'aliases': [row[2]], 'id': row[0], 'country': row[8], 'population': int(row[14] or '0'), 'modified': row[18]}


def main():
    cities = [item(row) for row in rows('cities15000.zip', 'cities15000.txt') if row[7] != 'PPLX']
    cities.sort(key=lambda r: -r['population'])
    localities, features = [], []
    for row in rows('geonames-ES.zip', 'ES.txt'):
        if row[6] == 'P' and row[7] not in ('PPLX', 'PPLQ', 'PPLW'):
            localities.append(item(row))
        if row[7] in ('STM', 'LK', 'LKS', 'MT', 'MTS', 'PK', 'VLC', 'DESRT'):
            features.append(item(row))
    localities.sort(key=lambda r: -r['population'])
    result = {'cities': cities, 'municipalities': localities, 'spanish-geography': features, 'geography': features[:600]}
    (CACHE / 'v3-geonames.json').write_text(json.dumps(result, ensure_ascii=False), encoding='utf-8')
    print('Full geographic coverage:', {key: len(value) for key, value in result.items()})


if __name__ == '__main__':
    main()
