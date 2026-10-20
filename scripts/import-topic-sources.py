"""Collect attributable topic candidates; category membership alone is not approval."""
import argparse
import csv
import hashlib
import importlib.util
import json
import pathlib
import re
import sys
import unicodedata
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('coverage_sources', ROOT / 'scripts/import-coverage.py')
coverage = importlib.util.module_from_spec(spec)
spec.loader.exec_module(coverage)
CACHE, download = coverage.CACHE, coverage.download

TOPICS = {
 'transport': ['Tipos de automóviles', 'Embarcaciones', 'Vehículos de propulsión humana', 'Vehículos de transporte'],
 'market': ['Especias', 'Condimentos', 'Legumbres', 'Frutos secos', 'Aceites vegetales'],
 'menu': ['Platos de pollo', 'Platos de pasta', 'Platos de arroz', 'Sopas', 'Guisos'],
 'kitchen': ['Utensilios de cocina', 'Electrodomésticos de cocina'],
 'home': ['Muebles', 'Electrodomésticos', 'Luminarias'],
 'sports': ['Deportes de equipo', 'Deportes acuáticos', 'Deportes de combate', 'Deportes de raqueta', 'Deportes de precisión'],
 'drinks': ['Cócteles', 'Tipos de café', 'Licores', 'Infusiones'],
 'desserts': ['Postres y dulces de España', 'Postres y dulces de Francia', 'Postres y dulces de Italia'],
 'mammals': ['Mamíferos de Europa', 'Mamíferos de Asia', 'Mamíferos de África'],
 'birds': ['Aves de Europa', 'Aves de Asia', 'Aves de África'],
 'fish': ['Peces del océano Atlántico', 'Peces del océano Pacífico', 'Peces de agua dulce'],
 'invertebrates': ['Crustáceos', 'Moluscos', 'Insectos', 'Arácnidos'],
 'reptiles': ['Reptiles de Europa', 'Anfibios de Europa', 'Reptiles de América del Sur'],
 'plants': ['Plantas medicinales', 'Plantas ornamentales', 'Plantas acuáticas'],
 'phenomena': ['Fenómenos meteorológicos', 'Fenómenos ópticos', 'Fenómenos geológicos'],
 'trees': ['Árboles y arbustos', 'Árboles frutales', 'Arbustos'],
 'jobs': ['Ocupaciones', 'Profesiones', 'Oficios'],
 'wardrobe': ['Indumentaria', 'Prendas de vestir', 'Calzado', 'Sombreros'],
 'instruments': ['Instrumentos de cuerda', 'Instrumentos de viento', 'Instrumentos de percusión'],
 'tools': ['Herramientas manuales', 'Herramientas de carpintero', 'Herramientas de jardinería'],
 'feelings': ['Emociones', 'Sentimientos', 'Estados mentales'],
 'containers': ['Recipientes', 'Envases', 'Embalaje'],
 'sports-equipment': ['Equipamiento deportivo', 'Balones', 'Equipamiento de ciclismo'],
 'spanish-food': ['Platos de pescado de España', 'Postres y dulces de España', 'Tapas en España'],
 'demonym': [],
 'math': ['Figuras geométricas', 'Conceptos matemáticos', 'Funciones matemáticas', 'Polígonos'],
 'anatomy': ['Huesos del ser humano', 'Músculos del ser humano', 'Órganos', 'Anatomía vegetal'],
 'materials': ['Materiales', 'Minerales', 'Plásticos', 'Fibras textiles', 'Aleaciones'],
 'inventions': ['Máquinas', 'Dispositivos electrónicos', 'Instrumentos de medición'],
 'disciplines': ['Disciplinas académicas', 'Ramas de la biología', 'Ramas de la física', 'Ciencias sociales'],
 'health': ['Enfermedades', 'Lesiones y heridas', 'Tipos de cáncer'],
 'astronomy': ['Fenómenos astronómicos', 'Objetos astronómicos', 'Tipos de estrellas', 'Constelaciones'],
 'geography': ['Montañas de África', 'Volcanes de Japón', 'Desiertos de Asia', 'Lagos de América del Sur'],
 'brands': ['Marcas de indumentaria', 'Marcas de electrodomésticos', 'Marcas de cosméticos', 'Marcas de productos alimenticios'],
}
CIE_URL = 'https://www.sanidad.gob.es/estadEstudios/estadisticas/normalizacion/CIE10/2026/Diagnosticos_Tabla_Referencia_CIE10ES_2026.xlsx'

def clinical_title(code, title):
    # Use broad diagnosis categories, not visits, procedures, external causes or
    # administrative statuses. Narrow clinical variants remain candidates only.
    if not re.fullmatch(r'[A-U][0-9]{2}(?:\.[0-9])?', str(code)) or str(code)[:3] in {'O80', 'O81', 'O82', 'O83', 'O84'}:
        return None
    if not isinstance(title, str) or re.search(r'\botr[oa]s?\b|no especificad|no clasificad|como causa de', title, re.I):
        return None
    return title[0].lower() + title[1:]

def import_health():
    sys.path.insert(0, str(CACHE / 'python-tools'))
    import openpyxl
    raw = download('cie10es-diagnosticos-2026.xlsx', CIE_URL)
    book = openpyxl.load_workbook(CACHE / 'cie10es-diagnosticos-2026.xlsx', read_only=True, data_only=True)
    entries = []
    for code, title, *_ in book['ES2026 Completa + Marcadores'].iter_rows(min_row=2, values_only=True):
        word = clinical_title(code, title)
        if word:
            # CIE parentheses enclose nonessential modifiers. Bracketed short
            # forms should not force a player to type the acronym as well.
            simple = re.sub(r'\s+', ' ', re.sub(r'\([^)]*\)|\[[^]]*\]', '', word)).strip()
            aliases = [simple] if simple != word else []
            if word.startswith('neoplasia maligna'):
                aliases.extend(re.sub('^neoplasia maligna', 'cáncer', name) for name in [word, simple])
            entries.append({'word': word, 'aliases': aliases, 'code': code, 'source': CIE_URL, 'score': 85})
    book.close()
    path = ROOT / 'content/imported-health-2026.json'
    path.write_text(json.dumps({'source': CIE_URL, 'sha256': hashlib.sha256(raw).hexdigest(), 'edition': 2026, 'entries': entries}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(f'CIE-10-ES: {len(entries)} broad diagnosis categories', flush=True)

def import_candidates():
    result = {}
    for identity, categories in TOPICS.items():
        candidates = {}
        for category in categories:
            for page in coverage.category_members(category):
                if not page['title'].startswith(('Anexo:', 'Categoría:', 'Historia de ', 'Museo', 'Lista de ')):
                    candidates.setdefault(page['title'], []).append(category)
        result[identity] = [{'title': title, 'categories': cats} for title, cats in sorted(candidates.items())]
        print(f'{identity}: {len(candidates)} candidates, not auto-approved', flush=True)
    (CACHE / 'topic-candidates-20261020.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8', newline='\n')
    manifest_path = CACHE / 'v3-topics-manifest.json'
    manifest_path.write_text(json.dumps(coverage.helpers.MANIFEST, ensure_ascii=False, indent=2), encoding='utf-8', newline='\n')

def import_dictionary():
    data = json.loads((ROOT / 'dist/data.json').read_text(encoding='utf-8'))
    url = data['sources']['dictionaryForms']['source']
    raw = download('forms.txt', url)
    # Attestation validates words independently of whether someone surveyed them.
    baseline = {row[0] for row in data['lexicon']}
    accepted = set()
    for row in csv.reader(raw.decode('utf-8').splitlines()):
        if len(row) > 2 and row[0] in baseline and row[1] in ('n', 'v', 'adj', 'adv'):
            accepted.add(row[0])
    result = {'source': url, 'sha256': hashlib.sha256(raw).hexdigest(), 'words': sorted(accepted)}
    (ROOT / 'content/imported-dictionary-coverage.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(f'Dictionary: {len(accepted)} independently attested baseline words', flush=True)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--health-only', action='store_true')
    args = parser.parse_args()
    import_health()
    import_dictionary()
    if not args.health_only:
        import_candidates()
