import importlib.util
import pathlib
import unittest
from unittest.mock import patch

ROOT = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('work_metadata', ROOT / 'scripts/import-work-coverage.py')
work = importlib.util.module_from_spec(spec)
spec.loader.exec_module(work)


class WorkMetadataTests(unittest.TestCase):
    def test_released_year_and_explicit_origin_place_a_film_in_the_correct_subsets(self):
        targets = work.scopes({'Películas de 1994', 'Películas de Estados Unidos', 'Películas de suspenso'})
        self.assertTrue({'films', 'films-1990', 'films-usa', 'films-thriller'} <= targets)

    def test_setting_filming_location_and_language_do_not_invent_origin_or_release(self):
        targets = work.scopes({'Películas en inglés', 'Películas rodadas en España', 'Películas ambientadas en 1980'})
        self.assertNotIn('films-spain', targets)
        self.assertNotIn('films-usa', targets)
        self.assertNotIn('films-1980', targets)

    def test_television_and_novels_keep_their_medium(self):
        self.assertEqual(work.scopes({'Series de televisión de España', 'Series de televisión de comedia'}), {'series', 'series-spanish', 'series-comedy'})
        self.assertEqual(work.scopes({'Novelas de 1943'}), {'books', 'novels'})
        self.assertEqual(work.scopes({'Desambiguación'}), set())

    def test_rerelease_dates_do_not_move_a_film_out_of_its_original_decade(self):
        def date(year, rank='normal'):
            return {'rank': rank, 'mainsnak': {'datavalue': {'value': {'time': f'+{year}-01-01T00:00:00Z', 'precision': 9}}}}
        response = {'entities': {'Q1': {'claims': {'P577': [date(1994), date(2019), date(1970, 'deprecated')]}}}}
        with patch.object(work, 'public_json', return_value=response):
            self.assertEqual(work.release_years(['Q1']), {'Q1': 1994})


if __name__ == '__main__':
    unittest.main()
