import { DATA_VERSION, normalize, TIERS, tierFor } from './engine.js?v=4';

const byPoints = new Map(Object.entries(TIERS).map(([key, tier]) => [tier.score, key]));
export function buildFocusedCategories(data, previous) {
  const bank = data.focused;
  if (!bank || bank.version !== DATA_VERSION || bank.minimumAnswers !== 100 || bank.parentRevision !== data.curated.coverageRevision) throw new Error('Las preguntas concretas están incompletas. Recarga la página.');
  const parents = new Map(previous.map(c => [c.id, c]));
  const categories = bank.questions.map(q => {
    const parent = parents.get(q.parent);
    let answers = q.all ? parent.answers : q.refs ? (() => {
      const wanted = new Set(q.refs);
      return parent.answers.filter(a => wanted.has(a.key));
    })() : [];
    if (q.answers?.length) {
      const additions = new Map(q.answers.map(([word, aliases, score, basis, count, days, history]) => [normalize(word), {
        word, key: normalize(word), aliases, scoreTier: byPoints.get(score), basis, count, daysListed: days,
        ...(history ? { historicalRecognition: history[0], historicalSample: history[1] } : {})
      }]));
      answers = answers.filter(a => !additions.has(a.key)).concat([...additions.values()]);
    }
    const metric = q.dictionary ? 'dictionary-es-2026' : 'curated-es';
    const gem = answers.find(a => tierFor(a, { metric }) === 'gem');
    const distinct = new Set(answers.map(a => a.key));
    if (distinct.size < 100 || distinct.size !== answers.length || answers.length !== q.count || !gem) throw new Error(`Pregunta incompleta: ${q.id}`);
    return { id: q.id, pack: q.pack, text: q.text, hint: q.hint || parent?.hint || 'Se aceptan los nombres y variantes registrados de esta categoría.', answers,
      gem: gem.word, clever: [], metric, dataVersion: DATA_VERSION, legacy: false,
      source: 'Repertorio revisado en octubre de 2026. Rareza desde España; los datos observados y las estimaciones editoriales se identifican en cada respuesta.' };
  });
  // Existing broad questions keep their meaning and saved scores, while gaining
  // newly reviewed valid answers/aliases from their more specific descendants.
  const compatible = {
    actors: ['actors'], films: ['films'], series: ['series'], books: ['books'],
    music: ['singers', 'bands', 'composers', 'rappers'],
    scientists: ['scientists'], writers: ['writers'], health: ['health', 'injuries', 'symptoms'],
    cities: ['cities'], 'spanish-towns': ['spanish-towns'], materials: ['materials'],
    geography: ['rivers-world', 'mountains-spain', 'lakes-spain', 'volcanoes'],
    'spanish-landscapes': ['rivers-spain', 'mountains-spain', 'lakes-spain'],
    'spanish-artists': ['actors-spain', 'writers-spain'],
    mammals: ['mammals'], birds: ['birds'], fish: ['fish'], plants: ['plants'],
    invertebrates: ['invertebrates'], home: ['furniture', 'appliances'],
    reptiles: ['dinosaurs'], market: ['market'], drinks: ['drinks']
  };
  for (const [identity, children] of Object.entries(compatible)) {
    const old = parents.get('q3-' + identity);
    if (!old) continue;
    const existing = new Map(old.answers.map(a => [a.key, a]));
    for (const child of children) for (const answer of categories.find(c => c.id === 'q4-' + child)?.answers || []) {
      const found = existing.get(answer.key);
      if (found) found.aliases = [...new Set([...found.aliases, ...answer.aliases])];
      else { const added = { ...answer, aliases: [...answer.aliases] }; old.answers.push(added); existing.set(added.key, added); }
    }
  }
  return categories;
}
