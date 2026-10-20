"""Retrieve explicitly scoped public memberships, never use them as Spain rarity data.

No recursive walk: only reviewed category titles are requested. The compiler
requires 100 canonical concepts, and excludes list/event/industry articles.
"""
import argparse
import concurrent.futures
import hashlib
import importlib.util
import json
import pathlib
import urllib.parse

spec = importlib.util.spec_from_file_location('coverage', pathlib.Path(__file__).with_name('import-coverage.py'))
coverage = importlib.util.module_from_spec(spec)
spec.loader.exec_module(coverage)
ROOT, CACHE = coverage.ROOT, coverage.CACHE


def fetch_question(question, category_results):
    members = {}
    for category in question.get('categories', []):
        for page in category_results[category]:
            title = page['title']
            if title.startswith(('Anexo:', 'Historia de ', 'Lista de ', 'Personajes de ', 'Cine de ', 'Literatura de ')):
                continue
            members[page['pageid']] = title
    return question['id'], sorted(members.values())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--only', nargs='+')
    parser.add_argument('--workers', type=int, default=3, choices=[1, 2, 3])
    args = parser.parse_args()
    questions = json.loads((ROOT / 'content/focused-questions.json').read_text(encoding='utf-8'))
    selected = [q for q in questions if q.get('categories') and (not args.only or q['id'] in args.only)]
    output = ROOT / 'content/imported-focused-memberships.json'
    data = json.loads(output.read_text(encoding='utf-8')) if output.exists() else {'checked': '2026-10-20', 'memberships': {}}
    parts = CACHE / 'focused-memberships'
    parts.mkdir(exist_ok=True)
    # At most three public requests at a time; the shared downloader caches and
    # respects server retry delays. Each result is independently reproducible.
    category_results, completed = {}, set()
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {executor.submit(coverage.category_members, title): title for title in dict.fromkeys(c for q in selected for c in q['categories'])}
        for future in concurrent.futures.as_completed(futures):
            category_results[futures[future]] = future.result()
            for q in selected:
                if q['id'] in completed or not all(c in category_results for c in q['categories']):
                    continue
                key, members = fetch_question(q, category_results)
                completed.add(key)
                data['memberships'][key] = members
                (parts / (key + '.json')).write_text(json.dumps(members, ensure_ascii=False), encoding='utf-8')
                print(f'{key}: {len(members)} source titles', flush=True)
    for part in parts.glob('*.json'):
        data['memberships'][part.stem] = json.loads(part.read_text(encoding='utf-8'))
    output.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    manifest = [{'file': row['file'], 'url': row['url'], 'sha256': row['sha256']} for row in coverage.helpers.MANIFEST]
    path = ROOT / 'content/focused-source-manifest.json'
    previous = json.loads(path.read_text(encoding='utf-8')) if path.exists() else []
    merged = {row['file']: row for row in previous + manifest}
    path.write_text(json.dumps(list(merged.values()), ensure_ascii=False, indent=2), encoding='utf-8', newline='\n')


if __name__ == '__main__':
    main()
