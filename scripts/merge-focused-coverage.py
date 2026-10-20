"""Add sourced people/titles to their existing unrestricted question sets."""
import json
import pathlib
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parent.parent
specs = json.loads((ROOT / 'content/focused-questions.json').read_text(encoding='utf-8'))
memberships = json.loads((ROOT / 'content/imported-focused-memberships.json').read_text(encoding='utf-8'))['memberships']
for family in ['actors', 'films', 'series', 'books', 'directors', 'music']:
    cache_family = 'musicians' if family == 'music' else family
    path = ROOT / '.cache' / f'v3-named-{cache_family}.json'
    data = json.loads(path.read_text(encoding='utf-8'))
    records = {r['name']['value']: r for r in data['results']['bindings']}
    before = len(records)
    for spec in specs:
        if spec.get('parent') != 'q3-' + family and not (family == 'actors' and spec['id'] == 'actor-coverage'):
            continue
        for title in memberships.get(spec['id'], []):
            records.setdefault(title, {'item': {'value': 'https://es.wikipedia.org/wiki/' + urllib.parse.quote(title.replace(' ', '_'))}, 'name': {'value': title}})
    data['results']['bindings'] = [records[key] for key in sorted(records)]
    path.write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')
    print(f'{family}: {before} -> {len(records)} independently sourced titles (+{len(records)-before})', flush=True)
