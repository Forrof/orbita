"""Pagination regressions; source requests are mocked and do not use the network."""
import importlib.util
import json
import pathlib
import unittest
import urllib.parse
from unittest.mock import patch

ROOT = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('coverage_import', ROOT / 'scripts/import-coverage.py')
coverage = importlib.util.module_from_spec(spec)
spec.loader.exec_module(coverage)


class CoveragePaginationTests(unittest.TestCase):
    def test_reads_every_page_and_deduplicates_overlapping_page_ids(self):
        responses = [
            {'query': {'categorymembers': [{'pageid': 1, 'title': 'Primero'}]}, 'continue': {'cmcontinue': 'next', 'continue': '-||'}},
            {'query': {'categorymembers': []}, 'continue': {'cmcontinue': 'last', 'continue': '-||'}},
            {'query': {'categorymembers': [{'pageid': 1, 'title': 'Primero'}, {'pageid': 2, 'title': 'Último'}]}},
        ]
        with patch.object(coverage, 'download', side_effect=[json.dumps(r) for r in responses]) as download:
            members = coverage.category_members('Actores')
        self.assertEqual([r['pageid'] for r in members], [1, 2])
        urls = [urllib.parse.parse_qs(urllib.parse.urlsplit(call.args[1]).query) for call in download.call_args_list]
        self.assertNotIn('cmcontinue', urls[0])
        self.assertEqual(urls[1]['cmcontinue'], ['next'])
        self.assertEqual(urls[2]['cmcontinue'], ['last'])

    def test_repeated_continuation_stops_instead_of_hanging(self):
        response = json.dumps({'query': {'categorymembers': []}, 'continue': {'cmcontinue': 'same'}})
        with patch.object(coverage, 'download', return_value=response), self.assertRaisesRegex(RuntimeError, 'Repeated continuation'):
            coverage.category_members('Actores')

    def test_api_errors_are_not_treated_as_empty_valid_categories(self):
        with patch.object(coverage, 'download', return_value=json.dumps({'error': {'code': 'badcontinue'}})), self.assertRaises(RuntimeError):
            coverage.category_members('Actores')


if __name__ == '__main__':
    unittest.main()
