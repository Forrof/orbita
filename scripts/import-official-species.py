"""Import species-level membership and names from MITECO's current public list.

The list's publication/reference period is not a 2026 recognition measurement.
Taxonomic categories select real species; fungi are never imported as plants.
"""
import collections
import hashlib
import json
import pathlib
import re
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / '.cache/python-tools'))
import openpyxl

URL = 'https://www.miteco.gob.es/content/dam/miteco/es/biodiversidad/servicios/banco-datos-naturaleza/recursos/listas/lista-patron-especies-silvestres.xlsx'
FISH = {'Actinopterygii', 'Chondrichthyes', 'Elasmobranchii', 'Holocephali', 'Sarcopterygii', 'Myxini', 'Petromyzonti', 'Cephalaspidomorphi', 'Petromyzontida'}


def main():
    path = ROOT / '.cache/miteco-especies.xlsx'
    if not path.exists():
        # The public CDN limits an individual response to 8 MiB.
        with urllib.request.urlopen(urllib.request.Request(URL, method='HEAD'), timeout=55) as response:
            total = int(response.headers['Content-Length'])
        chunks = []
        for start in range(0, total, 6_000_000):
            end = min(total - 1, start + 5_999_999)
            with urllib.request.urlopen(urllib.request.Request(URL, headers={'Range': f'bytes={start}-{end}', 'User-Agent': 'OrbitaGame/4.0 educational coverage'}), timeout=55) as response:
                raw = response.read()
                if response.status != 206 or len(raw) != end - start + 1:
                    raise RuntimeError('Incomplete species source range')
                chunks.append(raw)
        path.write_bytes(b''.join(chunks))
    book = openpyxl.load_workbook(path, read_only=True, data_only=True)
    entries = collections.defaultdict(list)
    fungal = set()
    for r in book.worksheets[0].iter_rows(min_row=2, values_only=True):
        if r[17] != 'Species' or not r[18]:
            continue
        if r[8] == 'Fungi':
            fungal.add(r[18].strip())
            if r[21]:
                fungal.add(str(r[21]).strip())
        identity = 'plants' if r[8] == 'Plantae' else 'mammals' if r[10] == 'Mammalia' else 'birds' if r[10] == 'Aves' else 'fish' if r[10] in FISH else 'invertebrates' if r[8] == 'Animalia' and (r[9] != 'Chordata' or r[10] in {'Ascidiacea', 'Thaliacea', 'Appendicularia', 'Leptocardii'}) else None
        if not identity:
            continue
        scientific = r[18].strip()
        if len(scientific) > 100:
            continue
        common = re.sub(r'\s+', ' ', str(r[21] or '')).strip()
        if common:
            common = common[0].lower() + common[1:]
        # Preserve the source's entire vernacular label; do not invent synonyms
        # by splitting punctuation in names. Scientific names stay as aliases.
        word = common if common and len(common) <= 100 else scientific
        entries[identity].append({'word': word, 'aliases': [scientific] if word != scientific else [], 'taxon': r[0]})
    book.close()
    output = {'checked': '2026-10-20', 'source': URL, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'reference': 'Current MITECO controlled list accessed in 2026; taxonomic membership only.', 'entries': dict(entries), 'excludedFungi': sorted(fungal)}
    (ROOT / 'content/imported-official-species.json').write_text(json.dumps(output, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8', newline='\n')
    print({key: len(value) for key, value in entries.items()}, flush=True)


if __name__ == '__main__':
    main()
