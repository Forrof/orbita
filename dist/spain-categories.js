import { normalize, hash } from './engine.js';
import { TOPICS } from './topics.js';

const SOURCE = 'SPALEX · reconocimiento de vocabulario por participantes nativos de España (NTS), 2014–2017. Las formas flexionadas heredan la medida de su lema cuando no existe una observación directa.';
const INTEREST_SOURCE = 'Wikimedia · lectores ubicados en España (ES), Wikipedia en español, septiembre de 2026. Índice = suma de valores redondeados publicados en listas diarias; días ausentes no equivalen a cero. No es un porcentaje de reconocimiento.';
const ALIASES = { 'Star Wars': ['La guerra de las galaxias'], 'Titanic (película de 1997)': ['Titanic'], 'Harry Potter': ['Harry Potter'], 'Juego de tronos': ['Game of Thrones'], 'El señor de los anillos': ['The Lord of the Rings'], 'Estados Unidos': ['EEUU', 'EE. UU.', 'USA', 'Estados Unidos de América'], 'Reino Unido': ['UK', 'Gran Bretaña'], 'Países Bajos': ['Holanda'], 'Chequia': ['República Checa'], 'Birmania': ['Myanmar'], 'República de Irlanda': ['Irlanda'], 'Corea del Sur': ['Corea del sur'] };
const COUNTRIES = new Set('España|Francia|Portugal|Italia|Alemania|Bélgica|Países Bajos|Luxemburgo|Suiza|Austria|Reino Unido|Irlanda|República de Irlanda|Islandia|Noruega|Suecia|Finlandia|Dinamarca|Estonia|Letonia|Lituania|Polonia|Chequia|Eslovaquia|Hungría|Eslovenia|Croacia|Bosnia y Herzegovina|Serbia|Montenegro|Albania|Macedonia del Norte|Grecia|Bulgaria|Rumanía|Moldavia|Ucrania|Bielorrusia|Rusia|Turquía|Chipre|Malta|Andorra|Mónaco|San Marino|Ciudad del Vaticano|Liechtenstein|Georgia|Armenia|Azerbaiyán|Kazajistán|Uzbekistán|Turkmenistán|Kirguistán|Tayikistán|Mongolia|China|Japón|Corea del Norte|Corea del Sur|India|Pakistán|Bangladés|Nepal|Bután|Sri Lanka|Maldivas|Afganistán|Irán|Irak|Siria|Líbano|Jordania|Israel|Palestina|Arabia Saudita|Yemen|Omán|Emiratos Árabes Unidos|Catar|Baréin|Kuwait|Birmania|Tailandia|Camboya|Laos|Vietnam|Malasia|Singapur|Indonesia|Filipinas|Brunéi|Timor Oriental|Australia|Nueva Zelanda|Papúa Nueva Guinea|Fiyi|Samoa|Tonga|Vanuatu|Islas Salomón|Marruecos|Argelia|Túnez|Libia|Egipto|Sudán|Sudán del Sur|Etiopía|Eritrea|Yibuti|Somalia|Kenia|Uganda|Tanzania|Ruanda|Burundi|República Democrática del Congo|República del Congo|República Centroafricana|Gabón|Guinea Ecuatorial|Camerún|Nigeria|Níger|Chad|Benín|Togo|Ghana|Costa de Marfil|Liberia|Sierra Leona|Guinea|Guinea-Bisáu|Senegal|Gambia|Mauritania|Malí|Burkina Faso|Cabo Verde|Santo Tomé y Príncipe|Angola|Zambia|Zimbabue|Mozambique|Malaui|Botsuana|Namibia|Sudáfrica|Lesoto|Esuatini|Madagascar|Mauricio|Seychelles|Comoras|Canadá|Estados Unidos|México|Guatemala|Belice|Honduras|El Salvador|Nicaragua|Costa Rica|Panamá|Cuba|Haití|República Dominicana|Jamaica|Trinidad y Tobago|Bahamas|Barbados|Granada|Dominica|Santa Lucía|Antigua y Barbuda|San Cristóbal y Nieves|San Vicente y las Granadinas|Colombia|Venezuela|Guyana|Surinam|Ecuador|Perú|Bolivia|Brasil|Paraguay|Uruguay|Argentina|Chile'.split('|').map(normalize));
const CITIES = new Set('Madrid|Barcelona|Valencia|Sevilla|Zaragoza|Málaga|Murcia|Palma de Mallorca|Palma|Las Palmas de Gran Canaria|Bilbao|Alicante|Córdoba|Valladolid|Vigo|Gijón|La Coruña|A Coruña|Granada|Vitoria|Vitoria-Gasteiz|Oviedo|Santa Cruz de Tenerife|Pamplona|San Sebastián|Santander|Almería|Burgos|Albacete|Castellón|Logroño|Badajoz|Huelva|Salamanca|Lérida|Tarragona|León|Cádiz|Jaén|Orense|Gerona|Lugo|Santiago de Compostela|Cáceres|Toledo|Ceuta|Melilla|Pontevedra|Palencia|Zamora|Ávila|Huesca|Cuenca|Segovia|Soria|Teruel|París|Londres|Roma|Berlín|Lisboa|Ámsterdam|Bruselas|Viena|Praga|Budapest|Varsovia|Atenas|Estambul|Moscú|Kiev|Dublín|Oslo|Estocolmo|Helsinki|Copenhague|Berna|Ginebra|Zúrich|Mónaco|San Marino|Tokio|Pekín|Beijing|Shanghái|Hong Kong|Seúl|Bangkok|Singapur|Nueva Delhi|Bombay|Calcuta|Katmandú|Yakarta|Manila|Hanói|Teherán|Bagdad|Damasco|Beirut|Jerusalén|Tel Aviv|Dubái|Abu Dabi|Doha|Riad|La Meca|El Cairo|Alejandría|Rabat|Casablanca|Marrakech|Argel|Túnez|Trípoli|Dakar|Nairobi|Ciudad del Cabo|Johannesburgo|Lagos|Accra|Nueva York|Los Ángeles|Chicago|Washington D. C.|San Francisco|Miami|Boston|Seattle|Las Vegas|Toronto|Montreal|Vancouver|Ottawa|Ciudad de México|Guadalajara|Monterrey|La Habana|Santo Domingo|San Juan|San José|Ciudad de Panamá|Bogotá|Medellín|Cartagena de Indias|Caracas|Quito|Guayaquil|Lima|La Paz|Sucre|Santiago de Chile|Buenos Aires|Montevideo|Asunción|Brasilia|Río de Janeiro|São Paulo|Sídney|Melbourne|Canberra|Auckland|Wellington'.split('|').map(normalize));

export function buildSpainCategories(data, legacy) {
  if (!data.forms || !data.spainNorms) return [];
  const categories = [], allForms = [], byWord = new Map();
  for (const [word, pos, normIndex] of data.forms) {
    const [measuredWord, count, sample] = data.spainNorms[normIndex];
    const a = { word, key: normalize(word), count, sample, measuredWord, pos, aliases: [] };
    allForms.push(a);
    const key = a.key, old = byWord.get(key);
    if (!old || count > old.count || word === measuredWord && old.word !== old.measuredWord) byWord.set(key, a);
  }
  const interest = (data.countryInterest || []).map(([title, count, daysListed, bestRank, cats, aliases, qid]) => ({ word: title, title, count, daysListed, bestRank, cats, aliases: [...aliases, ...(ALIASES[title] || [])], qid }));
  const interestByWord = new Map();
  for (const a of interest) for (const alias of [a.word, a.word.replace(/ \([^)]*\)$/, ''), ...a.aliases]) { const k = normalize(alias); if (!interestByWord.has(k)) interestByWord.set(k, a); }
  const gemFor = (answers, metric, id) => {
    if (metric !== 'recognition-es') return [...answers].sort((a, b) => a.count - b.count || a.word.localeCompare(b.word, 'es'))[Math.floor(answers.length * .35)]?.word || null;
    const target = 40 + hash(id) % 35;
    let direct = null, inherited = null, directDistance = Infinity, inheritedDistance = Infinity;
    for (const a of answers) {
      if (a.count >= 90) continue;
      const distance = Math.abs(a.count - target);
      if (a.word === a.measuredWord && distance < directDistance) { direct = a.word; directDistance = distance; }
      else if (distance < inheritedDistance) { inherited = a.word; inheritedDistance = distance; }
    }
    return direct || inherited;
  };
  const register = (id, pack, text, answers, metric = 'recognition-es', hint = 'Respuestas del repertorio · rareza valorada desde España', extra = {}) => {
    const uniqueMap = new Map();
    for (const a of answers) { const key = a.key || normalize(a.word), old = uniqueMap.get(key); if (!old || a.count > old.count) uniqueMap.set(key, a); }
    const unique = [...uniqueMap.values()];
    if (unique.length < 7) return;
    const gem = gemFor(unique, metric, id);
    if (!gem) return;
    categories.push({ id: `es-${id}`, pack, text, hint, answers: unique, metric, gem, clever: [], source: metric === 'recognition-es' ? SOURCE : INTEREST_SOURCE, legacy: false, ...extra });
  };
  // Retain finite semantic boundaries, but replace their old pan-Hispanic rank data.
  for (const c of legacy.filter(c => !['words', 'spain'].includes(c.pack))) {
    const answers = c.answers.map(a => {
      const evidence = byWord.get(normalize(a.word));
      return evidence && normalize(a.word) === normalize(evidence.measuredWord) ? { ...evidence, word: a.word, aliases: a.aliases || [] } : null;
    }).filter(Boolean);
    register(c.id, c.pack, c.text, answers, 'recognition-es', c.hint, { clever: c.clever.filter(w => answers.some(a => normalize(a.word) === normalize(w) && a.count >= 90)) });
  }
  for (const [id, pack, text, list] of TOPICS) {
    const answers = list.split('|').map(word => { const a = byWord.get(normalize(word)); return a && normalize(word) === normalize(a.measuredWord) ? { ...a, word, aliases: [] } : null; }).filter(Boolean);
    register(`topic-${id}`, pack, text, answers);
  }
  // Lexical filters are generated from actual dictionary entries with Spain evidence.
  const starts = new Map(), contains = new Map(), lengths = new Map(), positions = new Map();
  const append = (map, key, a) => { if (!map.has(key)) map.set(key, []); map.get(key).push(a); };
  for (const a of allForms) {
    const plain = a.key; append(starts, plain[0], a); append(lengths, a.word.length, a);
    for (const letter of new Set(plain)) append(contains, letter, a);
    for (const pos of a.pos.split('|')) append(positions, pos, a);
  }
  const flexHint = 'Se admiten formas flexionadas documentadas. Medida directa de España o heredada de su lema, indicada al responder.';
  register('all-words', 'words', 'Escribe una palabra española de nuestro repertorio.', allForms, 'recognition-es', flexHint, { broad: true });
  for (const letter of 'abcdefghijklmnñopqrstuvwxyz') {
    const id = letter === 'ñ' ? 'enye' : letter;
    register(`starts-${id}`, 'words', `Escribe una palabra que empiece por ${letter.toUpperCase()}.`, starts.get(letter) || [], 'recognition-es', flexHint);
    register(`contains-${id}`, 'words', `Escribe una palabra que contenga la letra ${letter.toUpperCase()}.`, contains.get(letter) || [], 'recognition-es', flexHint);
  }
  for (const length of [...lengths.keys()].sort((a, b) => a - b)) register(`length-${length}`, 'words', `Escribe una palabra de ${length} letras.`, lengths.get(length), 'recognition-es', flexHint);
  for (const [pos, label] of [['n', 'un sustantivo'], ['v', 'una forma verbal'], ['adj', 'un adjetivo'], ['adv', 'un adverbio']]) {
    const pool = positions.get(pos) || [];
    register(`pos-${pos}`, 'words', `Escribe ${label}.`, pool, 'recognition-es', flexHint);
    for (const letter of 'abcdefgilmnoprstuv') register(`pos-${pos}-${letter}`, 'words', `Escribe ${label} que empiece por ${letter.toUpperCase()}.`, pool.filter(a => a.key.startsWith(letter)), 'recognition-es', flexHint);
  }
  for (const suffix of ['ción', 'sión', 'dad', 'tad', 'mente', 'ismo', 'ista', 'aje', 'ero', 'era', 'or', 'ora', 'al', 'ivo', 'iva', 'oso', 'osa', 'able', 'ible', 'ico', 'ica', 'ito', 'ita', 'illo', 'illa', 'ón', 'ona', 'ar', 'er', 'ir']) register(`ends-${normalize(suffix)}`, 'words', `Escribe una palabra que termine en -${suffix}.`, allForms.filter(a => a.word.endsWith(suffix)), 'recognition-es', flexHint);
  for (const letters of ['rr', 'll', 'ch', 'qu', 'gu', 'br', 'bl', 'tr', 'dr', 'cr', 'cl', 'pr', 'pl', 'fr', 'fl', 'gr', 'gl', 'ct', 'pt', 'ps', 'mn', 'ae', 'eo', 'ia', 'io', 'ua', 'ue', 'ei']) register(`sequence-${letters}`, 'words', `Escribe una palabra que contenga ${letters.toUpperCase()}.`, allForms.filter(a => a.key.includes(letters)), 'recognition-es', flexHint);
  for (const prefix of ['anti', 'auto', 'bio', 'contra', 'des', 'extra', 'hiper', 'hipo', 'inter', 'micro', 'multi', 'neo', 'pos', 'pre', 'pro', 're', 'semi', 'sobre', 'sub', 'super', 'tele', 'trans', 'ultra']) register(`prefix-${prefix}`, 'words', `Escribe una palabra que empiece por ${prefix.toUpperCase()}.`, allForms.filter(a => a.key.startsWith(prefix)), 'recognition-es', flexHint);
  for (const [length, items] of lengths) if (length >= 4 && length <= 12) for (const letter of 'acmpst') register(`start-${letter}-length-${length}`, 'words', `Escribe una palabra de ${length} letras que empiece por ${letter.toUpperCase()}.`, items.filter(a => a.key.startsWith(letter)), 'recognition-es', flexHint);

  const has = (a, pattern) => a.cats.some(cat => pattern.test(cat));
  const named = (id, pack, text, predicate) => {
    const answers = interest.filter(predicate).map(a => ({ ...a, aliases: [...new Set([...a.aliases, a.word.replace(/ \([^)]*\)$/, '')])] }));
    register(`world-${id}`, pack, text, answers, 'interest-es', `Repertorio cerrado: ${answers.length} respuestas con interés publicado desde España en septiembre de 2026. Puedes consultarlas en el explorador de preguntas.`);
    return answers;
  };
  named('countries', 'world', 'Nombra un país.', a => COUNTRIES.has(normalize(a.word)));
  named('cities', 'world', 'Nombra una ciudad de cualquier país.', a => CITIES.has(normalize(a.word)));
  named('films', 'culture', 'Nombra una película.', a => has(a, /^Películas (de|sobre|dirigidas|basadas|ambientadas|rodadas|en) /));
  named('series', 'culture', 'Nombra una serie de televisión.', a => has(a, /^(Series de televisión|Series web|Telenovelas) /));
  named('actors', 'culture', 'Nombra un actor o una actriz.', a => has(a, /^(Actores|Actrices) /));
  named('singers', 'culture', 'Nombra un cantante o una cantante.', a => has(a, /^Cantantes /));
  named('bands', 'culture', 'Nombra un grupo musical.', a => has(a, /^Grupos de (música|rock|pop|heavy|metal|punk|indie|hip hop|synthpop)/));
  named('directors', 'culture', 'Nombra un director o una directora de cine.', a => has(a, /^Directores de cine /));
  named('writers', 'culture', 'Nombra un escritor o una escritora.', a => has(a, /^(Escritores|Escritoras|Novelistas|Poetas) /));
  named('footballers', 'world', 'Nombra un futbolista o una futbolista.', a => has(a, /^Futbolistas /));
  named('tennis', 'world', 'Nombra un tenista o una tenista.', a => has(a, /^Tenistas /));
  named('basketball', 'world', 'Nombra un jugador o una jugadora de baloncesto.', a => has(a, /^Baloncestistas /));
  named('athletes', 'world', 'Nombra un deportista de cualquier disciplina.', a => has(a, /^(Futbolistas|Tenistas|Baloncestistas|Ciclistas|Atletas|Nadadores|Nadadoras|Pilotos de|Gimnastas|Esquiadores|Patinadores|Boxeadores|Surfistas|Golfistas|Deportistas) /));
  named('football-clubs', 'world', 'Nombra un club de fútbol.', a => has(a, /^Equipos de fútbol /));
  named('videogames', 'culture', 'Nombra un videojuego.', a => has(a, /^Videojuegos (de|para|con|sobre|desarrollados|basados|ambientados)/));
  named('scientists', 'science', 'Nombra un científico o una científica.', a => has(a, /^(Científicos|Científicas|Físicos|Físicas|Químicos|Químicas|Biólogos|Biólogas|Matemáticos|Matemáticas|Astrónomos|Astrónomas|Geólogos|Geólogas) /));
  named('philosophers', 'culture', 'Nombra un filósofo o una filósofa.', a => has(a, /^(Filósofos|Filósofas) /));
  named('novels', 'culture', 'Nombra una novela.', a => has(a, /^Novelas (de|en|sobre|por|ambientadas|adaptadas)/));
  named('monarchs', 'world', 'Nombra un monarca histórico.', a => has(a, /^(Reyes|Reinas|Emperadores|Emperatrices|Faraones|Sultanes) /));
  named('composers', 'culture', 'Nombra un compositor o una compositora.', a => has(a, /^(Compositores|Compositoras) /));
  named('painters', 'culture', 'Nombra un pintor o una pintora.', a => has(a, /^(Pintores|Pintoras) /));
  named('mountains', 'world', 'Nombra una montaña o un volcán.', a => has(a, /^(Montañas|Volcanes|Cumbres) /));
  named('rivers', 'world', 'Nombra un río.', a => has(a, /^Ríos /));
  named('space', 'science', 'Nombra un cuerpo o una estructura del espacio.', a => has(a, /^(Planetas|Satélites naturales|Estrellas|Galaxias|Nebulosas|Constelaciones|Asteroides|Cometas|Agujeros negros) /));
  for (const c of legacy.filter(c => c.pack === 'spain')) {
    const answers = c.answers.map(a => { const found = [a.word, ...a.aliases].map(w => interestByWord.get(normalize(w))).find(Boolean); return found ? { ...found, word: a.word, aliases: a.aliases } : null; }).filter(Boolean);
    register(`geo-${c.id}`, 'spain', c.text, answers, 'interest-es', `${c.hint}. El INE delimita la categoría; la rareza usa interés desde España.`);
  }
  // Additional evidence-backed subsets make each themed pack varied without inventing data.
  const topicBases = categories.filter(c => c.pack !== 'words');
  for (const base of topicBases) {
    const countLetters = word => [...word.replace(/ \([^)]*\)$/, '').replace(/[^\p{L}]/gu, '')].length;
    for (const length of [5, 8]) {
      const answers = base.answers.filter(a => countLetters(a.word) >= length);
      if (base.answers.length - answers.length < Math.max(2, base.answers.length * .15)) continue;
      register(`${base.id}-long-${length}`, base.pack, `${base.text} Su nombre debe tener ${length} letras o más.`, answers.map(a => ({ ...a, aliases: a.aliases.filter(alias => countLetters(alias) >= length) })), base.metric, base.hint);
    }
  }
  return categories;
}
