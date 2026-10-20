"""Cache the expanded GeoNames settlement source; population never sets points."""
import hashlib
import json
import pathlib
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = 'https://download.geonames.org/export/dump/cities5000.zip'


def main():
    path = ROOT / '.cache/cities5000.zip'
    if not path.exists():
        with urllib.request.urlopen(urllib.request.Request(URL, headers={'User-Agent': 'OrbitaGame/4.0 educational coverage'}), timeout=55) as response:
            path.write_bytes(response.read())
    metadata = {'url': URL, 'checked': '2026-10-20', 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'populationIsRarity': False}
    (ROOT / 'content/expanded-geography-source.json').write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf-8', newline='\n')


if __name__ == '__main__':
    main()
