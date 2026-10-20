"""Measure a reviewed expansion against a committed snapshot, without padding.

Use --baseline only when deliberately making a comparative release audit.
"""
import argparse
import json
import pathlib
import re
import subprocess
import unicodedata

ROOT = pathlib.Path(__file__).resolve().parent.parent


def norm(text):
    text = text.lower().replace('ñ', '~')
    text = ''.join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn').replace('~', 'ñ')
    return ' '.join(re.sub('[^a-zñ0-9 ]', ' ', text).split())


def resolve(bank, focused):
    parents = {q['id']: q for q in bank['questions']}
    out = {}
    for q in focused['questions']:
        if q.get('dictionary'):
            continue
        parent = parents.get(q.get('parent'), {})
        wanted = set(q.get('refs', []))
        rows = {norm(a[0]): a for a in parent.get('answers', []) if q.get('all') or norm(a[0]) in wanted}
        rows.update({norm(a[0]): a for a in q.get('answers', [])})
        out[q['id']] = rows
    return out


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--baseline', required=True)
    args = parser.parse_args()
    def committed(path):
        return json.loads(subprocess.check_output(['git', 'show', f'{args.baseline}:{path}'], cwd=ROOT))
    def read(path):
        return json.loads((ROOT / path).read_text(encoding='utf-8'))
    old_bank, old_focus = committed('dist/repertory.json'), committed('dist/focused-repertory.json')
    new_bank, new_focus = read('dist/repertory.json'), read('dist/focused-repertory.json')
    old, new = resolve(old_bank, old_focus), resolve(new_bank, new_focus)
    old_counts = {q['id']: q['count'] for q in old_focus['questions']}
    audit = {'checked': '2026-10-20', 'previousCommit': args.baseline, 'activeQuestions': len(new_focus['questions']), 'previousAnswerSlots': sum(old_counts.values()), 'currentAnswerSlots': sum(q['count'] for q in new_focus['questions']), 'uniqueNewCanonicalLabels': len(set().union(*(set(v) for v in new.values())) - set().union(*(set(v) for v in old.values()))), 'questions': []}
    for q in new_focus['questions']:
        key = q['id']
        a, b = old.get(key, {}), new.get(key, {})
        av = {norm(t) for r in a.values() for t in [r[0], *r[1]]}
        bv = {norm(t) for r in b.values() for t in [r[0], *r[1]]}
        audit['questions'].append({'id': key, 'previous': old_counts[key], 'current': q['count'], 'newRecognizedSpellings': len(bv - av), 'retiredCanonicalLabels': len(set(a) - set(b)), 'retiredRecognizedSpellings': len(av - bv)})
    (ROOT / 'content/coverage-expansion-audit.json').write_text(json.dumps(audit, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    print({k: v for k, v in audit.items() if k != 'questions'})
    print('New recognized spellings across questions:', sum(q['newRecognizedSpellings'] for q in audit['questions']))


if __name__ == '__main__':
    main()
