"""Fetch additive, scoped memberships. Sources establish membership, not rarity.

Species candidates require a binomial title; other category lists remain pending
until their titles are included in the committed reviewed-membership file.
"""
import concurrent.futures
import importlib.util
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('coverage', ROOT / 'scripts/import-coverage.py')
coverage = importlib.util.module_from_spec(spec)
spec.loader.exec_module(coverage)


def main():
    plan = json.loads((ROOT / 'content/expanded-source-plan.json').read_text(encoding='utf-8'))
    categories = list(dict.fromkeys(c for q in plan.values() for c in q['categories']))
    results = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        futures = {executor.submit(coverage.category_members, c): c for c in categories}
        for future in concurrent.futures.as_completed(futures):
            category = futures[future]
            results[category] = future.result()
            print(f'{category}: {len(results[category])}', flush=True)
    candidates = {}
    for identity, config in plan.items():
        records = {}
        for category in config['categories']:
            for page in results[category]:
                title = page['title']
                if title.startswith(('Anexo:', 'Historia de ', 'Lista de ', 'Categoría:')):
                    continue
                records.setdefault(title, []).append(category)
        candidates[identity] = records
    path = ROOT / '.cache/expanded-candidates.json'
    path.write_text(json.dumps(candidates, ensure_ascii=False, indent=2), encoding='utf-8', newline='\n')
    manifest = ROOT / 'content/expanded-source-manifest.json'
    previous = json.loads(manifest.read_text(encoding='utf-8')) if manifest.exists() else []
    merged = {r['file']: r for r in previous + coverage.helpers.MANIFEST}
    manifest.write_text(json.dumps(list(merged.values()), ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')


if __name__ == '__main__':
    main()
