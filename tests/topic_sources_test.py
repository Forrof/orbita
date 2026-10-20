"""Source membership must describe an actual condition, not a medical visit."""
import importlib.util
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('topic_sources', ROOT / 'scripts/import-topic-sources.py')
topics = importlib.util.module_from_spec(spec)
spec.loader.exec_module(topics)

class ClinicalSourcesTests(unittest.TestCase):
    def test_common_diagnoses_and_injuries_are_eligible(self):
        self.assertEqual(topics.clinical_title('C61', 'Neoplasia maligna de próstata'), 'neoplasia maligna de próstata')
        self.assertEqual(topics.clinical_title('S52.5', 'Fractura del extremo inferior del radio'), 'fractura del extremo inferior del radio')
        self.assertEqual(topics.clinical_title('O00', 'Embarazo ectópico'), 'embarazo ectópico')
        self.assertEqual(topics.clinical_title('O85', 'Sepsis puerperal'), 'sepsis puerperal')
        self.assertEqual(topics.clinical_title('U09', 'Afección posCOVID-19'), 'afección posCOVID-19')

    def test_visits_external_causes_and_normal_birth_are_not_conditions(self):
        for code, label in [('Z00', 'Reconocimiento médico general'), ('V01', 'Peatón lesionado en colisión'), ('O80', 'Parto a término no complicado'), ('O82', 'Contacto para parto por cesárea'), ('Cap.01', 'Enfermedades'), ('A00-A09', 'Grupo'), ('C', 'Neoplasia')]:
            self.assertIsNone(topics.clinical_title(code, label), code)

    def test_vague_administrative_labels_are_not_answers(self):
        for label in ['Otras enfermedades del corazón', 'Dolor no especificado', 'Trastorno no clasificado bajo otro concepto']:
            self.assertIsNone(topics.clinical_title('I50', label))

if __name__ == '__main__':
    unittest.main()
