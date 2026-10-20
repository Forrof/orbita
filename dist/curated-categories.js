import { DATA_VERSION, TIERS, normalize, recognitionBand } from './engine.js?v=3';

const byPoints = new Map(Object.entries(TIERS).map(([key, tier]) => [tier.score, key]));
export function buildCuratedCategories(data, previous) {
  const bank = data.curated;
  if (!bank || bank.version !== DATA_VERSION || bank.minimumAnswers !== 100) throw new Error('El repertorio actualizado está incompleto.');
  const dictionary = previous.find(c => c.id === 'es-all-words');
  const reviewed = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' }).format(new Date(`${bank.checked}T12:00:00Z`));
  const decode = ([word, aliases, score, basis, count, days, history]) => ({
    word, key: normalize(word), aliases, scoreTier: byPoints.get(score), basis, count, daysListed: days,
    ...(history ? { historicalRecognition: history[0], historicalSample: history[1] } : {})
  });
  const categories = bank.questions.map(q => {
    const hint = q.id === 'q3-elements' ? 'Se aceptan los nombres y símbolos oficiales de los 118 elementos confirmados.' : ['q3-first-names', 'q3-surnames'].includes(q.id) ? 'Se admiten los registros publicados por el INE, con 20 o más residentes, y sus variantes ortográficas.' : q.hint;
    const answers = q.dictionary ? [...dictionary.answers, ...(q.additions || []).map(a => ({ ...decode(a), revised: true }))] : q.answers.map(decode);
    if (new Set(answers.map(a => a.key)).size < 100) throw new Error(`Menos de 100 respuestas: ${q.id}`);
    const gem = answers.find(a => (q.dictionary ? recognitionBand(a.count) : a.scoreTier) === 'gem');
    if (!gem) throw new Error(`Sin respuestas de 100 puntos: ${q.id}`);
    return { id: q.id, pack: q.pack, text: q.text, hint, answers, gem: gem.word, clever: [],
      metric: q.dictionary ? 'dictionary-es-2026' : 'curated-es', dataVersion: DATA_VERSION, legacy: false,
      source: `Edición revisada el ${reviewed}. Datos españoles recientes cuando existen; las estimaciones editoriales y las referencias históricas se identifican en cada respuesta.` };
  });
  // Extend these broad, already shared questions without changing recorded results or seeds.
  for (const [oldId, newId, limited] of [['es-world-footballers', 'q3-footballers'], ['es-topic-transport', 'q3-transport'], ['es-world-actors', 'q3-actors'], ['es-topic-natural-materials', 'q3-materials', ['lava', 'magma']]]) {
    const old = previous.find(c => c.id === oldId), fresh = categories.find(c => c.id === newId);
    if (!old || !fresh) continue;
    const existing = new Map(old.answers.map(a => [normalize(a.word), a]));
    for (const answer of fresh.answers) {
      if (limited && !limited.includes(answer.key)) continue;
      const found = existing.get(answer.key);
      if (found) Object.assign(found, answer, { aliases: [...new Set([...(found.aliases || []), ...answer.aliases])], revised: true });
      else old.answers.push({ ...answer, revised: true });
    }
    if (!limited) old.gem = fresh.gem;
  }
  return categories;
}
