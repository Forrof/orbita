import { TIERS, ROUNDS, ANSWER_MS, DATA_VERSION, CURATED_VERSION, SUPPORTED_VERSIONS, dailyMission, dailyDiscoveries, madridDate, dateOffset, missionNumber, band, normalize, createRun, validateRun, startRound, finishRound, advanceClock, matchAnswer, totalScore, streaks } from './engine.js?v=4.1';
import { buildCategories, PACKS } from './categories.js?v=4.1';
import { sourcePanel } from './sources-panel.js?v=4.1';

const $ = (selector, root = document) => root.querySelector(selector);
const main = $('#main'), dialog = $('#modal');
const KEY = 'orbita:flight-log:v1';
const fmt = n => new Intl.NumberFormat('es-ES').format(n);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const shortDate = date => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' }).format(new Date(date + 'T12:00:00Z'));
const today = () => madridDate();
const loadedDay = today();
const defaults = () => ({ schema: 1, runs: {}, settings: { sound: false, corrections: true, clearRejected: false, reducedMotion: false, outfit: 'ivory' }, unlimited: 1, chapters: {}, archivePage: 0 });
let data, categories, byId, store = defaults(), run = null, currentKey = '', route = 'daily', challenge = null, lastDay = today(), lastTimerSecond = -1, storageWarning = false, audio;
let feedbackMessage = '', toastTimeout, modalReturnFocus;
const outfits = [
  { id: 'ivory', name: 'Pionera', days: 0, color: '#ede5d0', symbol: '↗' },
  { id: 'sage', name: 'Exploradora', days: 5, color: '#abc2a5', symbol: '✦' },
  { id: 'rust', name: 'Viajera', days: 14, color: '#ce8668', symbol: '✧' },
  { id: 'lilac', name: 'Astrónoma', days: 30, color: '#c1acd2', symbol: '☾' },
  { id: 'gold', name: 'Estelar', days: 45, color: '#e7c080', symbol: '✷' }
];
function validSettings(settings = {}) {
  const out = defaults().settings;
  for (const key of ['sound', 'corrections', 'clearRejected', 'reducedMotion']) if (typeof settings[key] === 'boolean') out[key] = settings[key];
  if (outfits.some(x => x.id === settings.outfit)) out.outfit = settings.outfit;
  return out;
}
function loadStore(parsed) {
  const result = defaults();
  if (!parsed || parsed.schema !== 1 || !parsed.runs || typeof parsed.runs !== 'object') return result;
  result.settings = validSettings(parsed.settings);
  result.unlimited = Number.isSafeInteger(parsed.unlimited) && parsed.unlimited > 0 ? Math.min(parsed.unlimited, 1000000) : 1;
  for (const [key, value] of Object.entries(parsed.runs)) if (key.length < 160 && validateRun(value, categories)) result.runs[key] = value;
  for (const pack of Object.keys(PACKS)) if (Number.isInteger(parsed.chapters?.[pack]) && parsed.chapters[pack] >= 1 && parsed.chapters[pack] <= 30) result.chapters[pack] = parsed.chapters[pack];
  return result;
}
function save() {
  if (run && currentKey) store.runs[currentKey] = run;
  try { localStorage.setItem(KEY, JSON.stringify(store)); }
  catch { if (!storageWarning) { toast('El navegador no permite guardar. Puedes exportar tu cuaderno en Ajustes.'); storageWarning = true; } }
}
function completed() { return Object.values(store.runs).filter(r => r.phase === 'done'); }
function applySettings() { document.body.classList.toggle('reduce-motion', store.settings.reducedMotion); }
function toast(text) { clearTimeout(toastTimeout); $('#toast').textContent = text; $('#toast').classList.add('visible'); toastTimeout = setTimeout(() => $('#toast').classList.remove('visible'), 3500); }
function sound(type = 'click') {
  if (!store.settings.sound) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume().catch(() => {});
    const oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(type === 'gem' ? 784 : type === 'miss' ? 165 : 440, audio.currentTime);
    if (type !== 'miss') oscillator.frequency.exponentialRampToValueAtTime(type === 'gem' ? 1568 : 660, audio.currentTime + .15);
    gain.gain.setValueAtTime(.035, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .3);
    oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + .31);
  } catch { /* Sound is optional on browsers that restrict audio. */ }
}
function keyFor(mode, seed, pack = 'all') { return `${mode}:${pack}:${seed}`; }
function setRun(mode, seed, pack = 'all', dataVersion) {
  dataVersion ??= ['daily', 'archive'].includes(mode) ? dailyMission(String(seed)).dataVersion : DATA_VERSION;
  const oldKey = keyFor(mode, String(seed), pack);
  currentKey = oldKey + ':' + dataVersion;
  const previous = store.runs[currentKey] || (store.runs[oldKey]?.dataVersion === dataVersion ? store.runs[oldKey] : null);
  run = previous && (previous.phase !== 'intro' || previous.dataVersion === dataVersion) ? previous : createRun(categories, { mode, seed, pack, dataVersion });
  run = advanceClock(run, categories);
  feedbackMessage = '';
  save();
}
function routeRun() {
  // Returning to the daily after midnight also picks up newly published editions.
  if (route === 'daily' && today() !== loadedDay) { save(); location.reload(); return; }
  if (route === 'daily') setRun('daily', today());
  else if (route === 'unlimited') setRun('unlimited', String(store.unlimited));
  else if (route === 'challenge' && challenge) setRun('challenge', challenge.seed, challenge.pack, challenge.data);
  else if (route.startsWith('pack/')) {
    const [, pack, rawChapter] = route.split('/');
    if (!PACKS[pack] || pack === 'all') { location.hash = '#packs'; return; }
    const chapter = Math.max(1, Math.min(30, Number(rawChapter) || store.chapters[pack] || 1));
    store.chapters[pack] = chapter;
    setRun('pack', `${pack}-${chapter}`, pack);
  } else if (route.startsWith('archive/')) {
    const date = route.slice(8);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date + 'T12:00:00Z').toISOString().slice(0, 10) !== date || date >= today()) { location.hash = '#archive'; return; }
    setRun('archive', date);
  } else if (route.startsWith('log/')) {
    let key; try { key = decodeURIComponent(route.slice(4)); } catch { key = ''; }
    if (store.runs[key]?.phase === 'done') { run = store.runs[key]; currentKey = key; }
    else { run = null; currentKey = ''; }
  } else { run = null; currentKey = ''; }
}
function modeName(r = run) { return r.mode === 'daily' ? 'MISIÓN DIARIA' : r.mode === 'archive' ? 'ARCHIVO · ' + shortDate(r.seed).toUpperCase() : r.mode === 'pack' ? PACKS[r.pack].name.toUpperCase() : r.mode === 'challenge' ? 'RETO ENTRE AMIGOS' : 'SIN LÍMITES'; }
function modeDetail(r = run) { return r.mode === 'daily' ? `#${String(missionNumber(r.seed)).padStart(3, '0')} · ${shortDate(r.seed)}` : r.mode === 'unlimited' ? `Vuelo ${r.seed}` : r.mode === 'pack' ? `Capítulo ${r.seed.split('-').at(-1)} de 30` : r.mode === 'archive' ? 'Misión por fecha' : 'Las mismas siete señales'; }
function rarityGrid() {
  return `<div class="rarity-grid">${Object.entries(TIERS).filter(([id]) => !['miss', 'clever'].includes(id)).map(([id, t]) => `<div class="rarity-item" style="--tier:${t.color}"><span class="tier-symbol" aria-hidden="true">${t.symbol}</span><div><strong>${t.name}</strong><small>${t.score} puntos</small></div></div>`).join('')}</div>`;
}
function howRow() { return `<section class="how-row" aria-label="Cómo funciona"><div class="how-step"><span class="mono">01</span><div><h3>Recibe una señal</h3><p>Una categoría. 25 segundos. Escribe una respuesta que encaje.</p></div></div><div class="how-step"><span class="mono">02</span><div><h3>Escapa de lo evidente</h3><p>Cuanto menos común sea tu respuesta, más lejos viajarás.</p></div></div><div class="how-step"><span class="mono">03</span><div><h3>Encuentra tu órbita</h3><p>Siete oportunidades para alcanzar los 700 puntos. ¿Hasta dónde llegas?</p></div></div></section>`; }
function landing() {
  const daily = run.mode === 'daily', pack = run.mode === 'pack', unlimited = run.mode === 'unlimited', isChallenge = run.mode === 'challenge';
  const title = daily ? 'Las palabras raras<br>llegan <em>más lejos.</em>' : pack ? `${esc(PACKS[run.pack].name)}.<br><em>Todo un universo.</em>` : isChallenge ? 'Mismas señales.<br><em>Tu propia órbita.</em>' : 'La curiosidad<br><em>no tiene límites.</em>';
  const lead = daily ? 'Siete categorías. Veinticinco segundos. Una palabra poco común puede llevarte muy lejos.' : pack ? esc(PACKS[run.pack].subtitle) + ' Siete señales de un mismo universo para poner a prueba lo que sabes.' : isChallenge ? 'Alguien te invita a volar por las mismas categorías. Su puntuación se revela cuando completes la misión.' : 'Otra misión, otras siete señales. Practica, descubre palabras y vuelve a despegar tantas veces como quieras.';
  main.innerHTML = `<section class="hero"><div class="hero-copy"><div class="pill"><span class="status-dot"></span>${modeName()} <span style="opacity:.45">/</span> ${esc(daily ? '#' + String(missionNumber(run.seed)).padStart(3, '0') : modeDetail())}</div><h1>${title}</h1><p class="lead">${lead}</p><div class="hero-buttons"><button class="primary" data-action="launch">Iniciar misión <span class="arrow" aria-hidden="true">↗</span></button><button class="text-button" data-action="help"><span class="question-circle">?</span>Cómo se juega</button></div><div class="mission-meta"><div><b>07</b><span>categorías<br>por misión</span></div><div><b>25<span style="font-size:14px;text-transform:none">s</span></b><span>por cada<br>señal</span></div><div><b>700</b><span>puntos<br>posibles</span></div></div>${daily ? `<p class="daily-next">${esc(shortDate(today()))} · La misma misión para todo el mundo.</p>` : ''}${pack ? chapterNavigation() : ''}</div><div class="hero-visual" aria-label="Ilustración: un cohete abandona la Tierra entre órbitas y estrellas"><img src="./assets/expedition.svg" alt="" width="600" height="600"><span class="visual-note mono">NO HACE FALTA SABERLO TODO.<br>SOLO PENSAR UN POCO MÁS ALLÁ.</span></div></section>${databaseBanner()}<section class="rarity-section" aria-label="Niveles de puntuación"><div class="section-label"><span class="mono">CADA PALABRA, UNA ALTURA</span><p>De lo cotidiano a lo extraordinario.</p></div>${rarityGrid()}</section>${howRow()}`;
}
function chapterNavigation() {
  const chapter = Number(run.seed.split('-').at(-1));
  return `<div class="inline-actions" style="margin-top:23px"><span class="mono" style="color:var(--muted);font-size:9px">CAPÍTULO</span><select aria-label="Elegir capítulo" id="chapter-select" style="background:var(--bg);color:var(--cream);border:1px solid var(--line);padding:5px 8px;border-radius:4px;font-size:11px">${Array.from({ length: 30 }, (_, i) => `<option value="${i + 1}" ${chapter === i + 1 ? 'selected' : ''}>${String(i + 1).padStart(2, '0')}${store.runs[keyFor('pack', `${run.pack}-${i + 1}`, run.pack)]?.phase === 'done' ? ' ✓' : ''}</option>`).join('')}</select><a href="#packs" class="text-button">Ver constelaciones ↗</a></div>`;
}
function flightMap() {
  const score = totalScore(run), y = 337 - score / 700 * 284, x = 170 + score / 700 * 134;
  const selectedOutfit = outfits.find(o => o.id === store.settings.outfit) || outfits[0];
  return `<div class="game-visual" aria-label="Tu cohete ha recorrido ${fmt(score * 10)} kilómetros"><div class="flight-frame"><span class="flight-label mono">DISTANCIA RECORRIDA</span><div class="altitude-number">${fmt(score * 10)}<span>km</span></div><svg class="flight-svg" viewBox="0 0 420 425" fill="none" aria-hidden="true"><defs><linearGradient id="flight-trail" x1="170" y1="345" x2="304" y2="53" gradientUnits="userSpaceOnUse"><stop stop-color="#e7c080" stop-opacity=".02"/><stop offset="1" stop-color="#e7c080" stop-opacity=".5"/></linearGradient></defs><g stroke="#b4c5b318" stroke-width="1"><path d="M55 82H375M55 157H375M55 232H375M55 307H375" stroke-dasharray="2 6"/><circle cx="248" cy="406" r="125"/><circle cx="248" cy="406" r="205"/><circle cx="248" cy="406" r="285"/><circle cx="248" cy="406" r="365"/></g><g fill="#a7b6a9" opacity=".55" font-family="monospace" font-size="8"><text x="360" y="75">7000</text><text x="360" y="150">5000</text><text x="360" y="225">3000</text><text x="360" y="300">1000</text></g><path d="M170 350C170 231 266 204 304 53" stroke="url(#flight-trail)" stroke-width="14"/><path d="M170 350C170 231 266 204 304 53" stroke="#d1be8760" stroke-dasharray="3 7"/><circle cx="228" cy="467" r="113" fill="#7f9e8d"/><path d="M133 408L182 387L220 403L238 438L212 454L218 484H115M268 378L260 407L286 429L279 459L333 479V384" fill="#bfc7a4" fill-opacity=".6"/><path d="M283 368C236 416 256 475 300 500H350V365" fill="#314d48" fill-opacity=".5"/><circle cx="228" cy="467" r="117" stroke="#90b09b" stroke-opacity=".14" stroke-width="4"/><g fill="#d2c5a2"><path d="M321 69L323 76L330 78L323 80L321 87L319 80L312 78L319 76Z"/><circle cx="99" cy="164" r="1.4"/><circle cx="345" cy="236" r="1.2"/><circle cx="282" cy="120" r="1"/><circle cx="194" cy="195" r="1.3"/></g><g class="flight-craft" style="--rx:${x}px;--ry:${y}px"><g transform="rotate(23)"><path d="M-9 14L-17 34L0 28L17 34L9 14" fill="#ce8061"/><path d="M-10 18C-13-6-9-27 0-38C9-27 13-6 10 18Z" fill="${selectedOutfit.color}"/><path d="M0-38C5-31 8-23 10-16H-10C-8-23-5-31 0-38" fill="#ce8061"/><circle cy="-3" r="6" fill="#1b3640" stroke="#bfb59f" stroke-width="2"/><path class="flame" d="M-5 22L-7 37L0 49L7 37L5 22" fill="#e7c080"/><path d="M-2 22L0 39L2 22" fill="#fff1c4"/></g></g></svg><div class="flight-status mono"><span><span class="status-dot"></span> TELEMETRÍA ACTIVA</span><span>01 PUNTO = 10 KM</span></div></div></div>`;
}
function scoreStrip() {
  return `<div class="score-strip"><div><span class="mono">PUNTUACIÓN</span><span class="score-val">${totalScore(run)}</span><small>/ 700</small></div><div class="score-badges" aria-label="Resultados por ronda">${Array.from({ length: ROUNDS }, (_, i) => { const r = run.results[i], t = r ? TIERS[r.tier] : null; return `<span class="score-badge" style="--tier:${t?.color || '#ffffff25'}" title="${r ? `Ronda ${i + 1}: ${t.name}, ${r.score} puntos` : `Ronda ${i + 1}, pendiente`}">${t?.symbol || '·'}</span>`; }).join('')}</div><span class="mono distance-summary">DESTINO: ${esc(TIERS[band(totalScore(run))].name)}</span></div>`;
}
function gameScreen() {
  const c = byId.get(run.prompts[run.round]);
  if (!c) return;
  const preview = run.phase === 'preview';
  const content = run.phase === 'feedback' ? feedbackScreen(c) : `<div class="game-copy"><div class="round-top"><div class="round-pips" aria-label="Ronda ${run.round + 1} de 7">${run.prompts.map((_, i) => `<span class="pip ${i < run.round ? 'done' : i === run.round ? 'current' : ''}" style="--tier:${TIERS[run.results[i]?.tier]?.color || ''}"></span>`).join('')}</div><span class="timer" aria-label="Tiempo restante"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="13" r="8"/><path d="M12 8V13L15 15M9 2H15M12 2V5"/></svg><span id="timer-value">${preview ? '3' : '25'}</span><span style="font-size:10px;opacity:.5">s</span></span></div><div class="eyebrow">SEÑAL ${String(run.round + 1).padStart(2, '0')} / 07 <span style="opacity:.4">—</span> ${esc(PACKS[c.pack].name.toUpperCase())}</div><h1 id="prompt-title">${esc(c.text)}</h1><p class="game-hint">${esc(c.hint)}</p>${preview ? `<div class="preview-status" aria-live="polite"><span class="preview-count" id="preview-count">3</span><p>Piensa más allá de lo evidente.<br>Tu tiempo empieza en un momento.</p></div>` : `<form id="answer-form" autocomplete="off"><label class="hidden" for="answer">Tu respuesta</label><div class="answer-wrap"><input id="answer" name="answer" aria-label="Tu respuesta" aria-describedby="answer-error" placeholder="Tu respuesta menos obvia…" maxlength="100" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(run.draft || '')}"><button type="submit" aria-label="Transmitir respuesta" title="Transmitir respuesta">↗</button></div><div class="form-bottom"><span><kbd>Enter ↵</kbd> para transmitir</span><button type="button" data-action="skip">Pasar señal →</button></div></form><div class="answer-error" id="answer-error" role="status" aria-live="polite">${feedbackMessage}</div><p class="game-caption">Puedes volver a intentarlo si no encaja. El reloj sigue corriendo.</p>`}<div class="time-track" aria-hidden="true"><div id="time-fill"></div></div></div>`;
  main.innerHTML = `<div class="below-heading"><div class="eyebrow"><span class="status-dot"></span>${modeName()} <span style="opacity:.5">/</span> ${esc(modeDetail())}</div><button class="text-button" data-action="help">? Reglas de vuelo</button></div><section class="game-layout" aria-labelledby="${run.phase === 'feedback' ? 'feedback-title' : 'prompt-title'}">${content}${flightMap()}</section>${scoreStrip()}`;
  updateTimer();
  if (run.phase === 'answering') $('#answer')?.focus({ preventScroll: true });
  if (run.phase === 'feedback') $('#continue')?.focus({ preventScroll: true });
}
function evidenceText(result) {
  if (result.metric === 'curated-es') {
    if (result.basis === 'ine-names-2026' || result.basis === 'ine-surnames-2026') return `${fmt(result.count)} residentes${result.basis === 'ine-surnames-2026' ? ' con este primer apellido' : ' con este nombre'} · INE, datos a 1 de enero de 2025 publicados el 23 de abril de 2026. Menor frecuencia, más puntos.`;
    if (result.basis === 'interest-2026') return `Interés desde España · ${fmt(result.count)} como suma de valores redondeados publicados, ${result.daysListed} días observados entre el 1/9 y el 18/10 de 2026. No equivale a visitas totales ni a un porcentaje de reconocimiento.`;
    if (result.basis === 'editorial-historical') return `Estimación editorial de 2026 con referencia histórica: ${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(result.historicalRecognition)} % de reconocimiento en ${fmt(result.historicalSample)} participantes nativos de España · SPALEX, 2014–2017.${result.measuredWord && normalize(result.answer) !== normalize(result.measuredWord) ? ` Referencia heredada del lema «${result.measuredWord}».` : ''} No es una medición de 2026.`;
    return 'Estimación editorial · revisión de 2026 para el público de España. Esta puntuación no procede de una estadística reciente de reconocimiento.';
  }
  if (result.metric === 'recognition-es') {
    const percent = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(result.count);
    const inherited = normalize(result.answer) !== normalize(result.measuredWord);
    return `${percent} % de reconocimiento en ${fmt(result.sample)} participantes del grupo de España · SPALEX, 2014–2017.${inherited ? ` Medida heredada del lema «${result.measuredWord}»; no es una medición independiente de esta flexión.` : ' Medición histórica directa de esta palabra.'}`;
  }
  if (result.metric === 'interest-es') return `Índice de interés desde España: ${fmt(result.count)} · ${result.daysListed} días publicados de septiembre de 2026. Valores redondeados de listas diarias; no es un total exacto de visitas ni un porcentaje de reconocimiento.`;
  return result.count == null ? 'Partida del repertorio inicial · rareza editorial sin frecuencia disponible.' : result.metric === 'population' ? `${fmt(result.count)} habitantes · INE, 1 de enero de 2025. Reglas del repertorio inicial.` : `${fmt(result.count)} apariciones del lema en el corpus del repertorio inicial. No es un porcentaje de jugadores.`;
}
function feedbackScreen(c) {
  const result = run.results.at(-1), tier = TIERS[result.tier], metric = evidenceText(result);
  return `<div class="game-copy feedback" style="--tier:${tier.color}"><div class="result-tier"><span>${tier.symbol}</span>${tier.name}</div><h1 id="feedback-title">${result.accepted ? `«${esc(result.answer)}»` : result.skipped ? 'Dejamos pasar esta señal.' : result.raw ? `«${esc(result.raw)}»` : 'Se acabó el tiempo.'}</h1><div class="points-award">+${result.score}<small>PUNTOS · ${fmt(result.score * 10)} KM MÁS LEJOS</small></div><p>${esc(tier.text)}</p>${!result.accepted && result.raw && !result.skipped ? `<p class="smallprint">La respuesta no está en el repertorio de esta categoría.</p>` : ''}<p class="source-note">${result.accepted ? esc(metric) : 'Una señal sin respuesta suma 0 puntos.'}</p><button id="continue" class="primary" data-action="continue">${run.results.length === ROUNDS ? 'Ver mi expedición' : 'Siguiente señal'}<span class="arrow" aria-hidden="true">↗</span></button><p class="smallprint">${run.results.length === ROUNDS ? 'Las siete señales están completas.' : `${ROUNDS - run.results.length} ${ROUNDS - run.results.length === 1 ? 'señal' : 'señales'} por descubrir. Respira: aquí el reloj está parado.`}</p></div>`;
}
function submitAnswer(raw, confirmed = false) {
  run = advanceClock(run, categories);
  if (run.phase !== 'answering') { save(); render(); return; }
  const value = String(raw).trim().slice(0, 100);
  if (!value) { $('#answer')?.focus(); return; }
  const result = matchAnswer(value, byId.get(run.prompts[run.round]), store.settings.corrections && !confirmed);
  if (result.accepted) { run = finishRound(run, result, value); save(); sound(result.tier); render(); }
  else {
    feedbackMessage = result.suggestion ? `¿Querías decir <button class="suggestion" data-action="suggest" data-value="${esc(result.suggestion)}">${esc(result.suggestion)}? Confirmar ↗</button>` : `«${esc(value)}» no está en este repertorio. Prueba otra respuesta.`;
    $('#answer-error').innerHTML = feedbackMessage;
    if (store.settings.clearRejected) { run.draft = ''; $('#answer').value = ''; }
    save(); $('#answer')?.focus();
  }
}
function updateTimer() {
  if (!run || !['preview', 'answering'].includes(run.phase)) return;
  const remaining = Math.max(0, run.deadline - Date.now()), second = Math.ceil(remaining / 1000);
  const timer = $('#timer-value');
  if (timer) timer.textContent = String(second).padStart(2, '0');
  const previewCount = $('#preview-count'); if (previewCount) previewCount.textContent = second;
  const fill = $('#time-fill'); if (fill) fill.style.width = `${Math.min(100, remaining / (run.phase === 'preview' ? 3000 : ANSWER_MS) * 100)}%`;
  $('.timer')?.classList.toggle('urgent', run.phase === 'answering' && second <= 5);
  if (run.phase === 'answering' && second <= 3 && second > 0 && second !== lastTimerSecond) sound('miss');
  lastTimerSecond = second;
}
function finishMission() {
  if (run.results.length !== ROUNDS) return;
  run = { ...run, phase: 'done', completedAt: Date.now() }; save();
  render(); $('#main').focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' });
}
function resultScreen() {
  const score = totalScore(run), tier = TIERS[band(score)];
  main.innerHTML = `<section class="results-heading"><div><div class="eyebrow"><span class="status-dot"></span>EXPEDICIÓN COMPLETADA · ${esc(modeDetail())}</div><h1>${esc(tier.name)}.<br><em style="color:var(--gold)">Tu curiosidad te ha traído aquí.</em></h1><p>${fmt(score * 10)} km de viaje · ${run.results.filter(r => r.accepted).length} señales recibidas · 7 palabras para recordar.</p></div><div class="final-score">${score}<small>/ 700 puntos</small></div></section>${challenge && run.mode === 'challenge' ? comparison() : ''}<div class="trajectory" aria-label="Puntuaciones de las siete rondas">${run.results.map((r, i) => `<div style="--tier:${TIERS[r.tier].color};--score:${r.score}" title="Señal ${i + 1}: ${r.score} puntos"><span class="trail-symbol">${TIERS[r.tier].symbol}</span><div class="trail"></div><small>${String(i + 1).padStart(2, '0')} · ${r.score}</small></div>`).join('')}</div><div class="results-tools"><button class="primary" data-action="share">Compartir resultado <span class="arrow">↗</span></button><button class="secondary" data-action="challenge-link">Retar a alguien ◎</button>${run.mode === 'pack' ? `<button class="secondary" data-action="next-chapter">Siguiente capítulo →</button>` : `<button class="secondary" data-action="next-unlimited">Seguir explorando ∞</button>`}</div>${run.mode === 'daily' ? run.seed !== today() ? `<p class="daily-next">Ya está disponible una nueva misión. <button class="text-button" data-action="today-daily">Abrir el diario de hoy →</button></p>` : `<p class="daily-next">La próxima misión llega a medianoche, hora de Madrid. <span id="next-daily-countdown"></span></p>` : ''}<div class="section-label" style="margin-top:29px"><span class="mono">TU CUADERNO DE SEÑALES</span><p>Tus respuestas y puntos de esta expedición.</p></div><ol class="mission-recap" aria-label="Tus respuestas de esta partida">${run.results.map((r, i) => { const c = byId.get(r.prompt), t = TIERS[r.tier]; return `<li class="recap-row" style="--tier:${t.color}"><span class="num">${String(i + 1).padStart(2, '0')}</span><span class="recap-question">${esc(c.text)}</span><span class="recap-answer">${esc(r.answer || r.raw || 'Sin señal')}</span><span class="recap-points">+${r.score}</span></li>`; }).join('')}</ol>${dailySolutions()}<div class="inline-actions" style="margin-bottom:25px"><button class="text-button" data-action="stats">Mi cuaderno de vuelo ↗</button><a href="#packs" class="text-button">Explorar constelaciones ↗</a><button class="text-button" data-action="sources">Cómo se calcula la rareza ↗</button></div>`;
  updateCountdown();
}
function comparison() {
  const score = totalScore(run), diff = score - challenge.score;
  return `<div class="challenge-comparison"><div><span class="mono">TU RESULTADO</span><br><strong>${score}</strong></div><p>${diff > 0 ? `Has llegado ${diff} puntos más lejos.` : diff < 0 ? `Te han sacado ${-diff} puntos. La próxima señal puede ser tuya.` : 'La misma altura. ¡Empate orbital!'}<br>Comparación con la puntuación compartida por quien te retó.</p><div><span class="mono">SU RESULTADO</span><br><strong>${challenge.score}</strong></div></div>`;
}
function dailySolutions() {
  const discoveries = dailyDiscoveries(run, categories);
  if (!discoveries.length) return '';
  const basisLabel = basis => basis === 'interest-2026' ? 'Interés observado desde España' : basis?.startsWith('ine-') ? 'Frecuencia publicada por el INE' : basis === 'editorial-historical' ? 'Estimación editorial · referencia histórica' : 'Rareza editorial';
  return `<section class="daily-discoveries" aria-labelledby="discoveries-title"><div class="section-label"><span class="mono">LOS HALLAZGOS DEL DIARIO</span><p>Soluciones desbloqueadas al completar las siete señales.</p></div><h2 id="discoveries-title">Las respuestas que llegaban más lejos.</h2><p>Tres respuestas de mayor puntuación por pregunta. Puede haber más respuestas empatadas: esto es una selección, no un porcentaje de elecciones de otros jugadores.</p><div class="discoveries-grid">${discoveries.map((d, i) => `<article class="discovery-card"><span class="mono">SEÑAL ${String(i + 1).padStart(2, '0')}</span><h3>${esc(d.text)}</h3><p class="discovery-own">Tu respuesta: <strong>${esc(d.ownAnswer || 'Sin señal')}</strong> · ${d.ownScore} puntos</p><ol>${d.answers.map(a => `<li class="${normalize(a.word) === normalize(d.ownAnswer) ? 'discovered' : ''}"><span><strong>${esc(a.word)}</strong><small>${esc(basisLabel(a.basis))}</small></span><b>+${a.score}</b></li>`).join('')}</ol></article>`).join('')}</div></section>`;
}
function databaseBanner() {
  return `<section class="database-banner" aria-label="Base de preguntas ampliada"><div><span class="mono">LA MISMA CURIOSIDAD. MUCHO MÁS UNIVERSO.</span><p><strong>${fmt(categories.filter(c => !c.legacy).length)}</strong> preguntas diferentes · <strong>100+</strong> respuestas por pregunta · 7 constelaciones</p><small>${fmt(data.focused.questions.reduce((total, q) => total + q.count, 0))} respuestas registradas entre todas las categorías. Rareza desde España, con datos y estimaciones identificados.</small></div></section>`;
}
function packsScreen() {
  main.innerHTML = `<div class="page-heading"><div class="eyebrow"><span class="status-dot"></span>SIETE UNIVERSOS, LA MISMA CURIOSIDAD</div><h1>Constelaciones.</h1><p>Elige un tema y explora sus 30 capítulos. Los temas recorren el mundo; la rareza se valora desde España.</p></div><div class="pack-grid">${Object.entries(PACKS).filter(([id]) => id !== 'all').map(([id, p]) => { const done = new Set(completed().filter(r => r.mode === 'pack' && r.pack === id).map(r => r.seed)).size; return `<article class="pack-card"><span class="pack-icon" aria-hidden="true">${p.icon}</span><span class="mono" style="font-size:9px;color:var(--muted)">${categories.filter(c => !c.legacy && c.pack === id).length} CATEGORÍAS · 30 CAPÍTULOS</span><h2>${p.name}</h2><p>${p.subtitle}</p><a class="secondary" href="#pack/${id}/${store.chapters[id] || 1}">Explorar constelación ↗</a><span class="pack-progress">${done} / 30</span></article>`; }).join('')}</div><p class="archive-note">Cada capítulo combina siete categorías del tema. Algunas categorías reaparecen para que puedas probar respuestas distintas.</p>`;
}
function archiveScreen() {
  const end = dateOffset(today(), -1 - store.archivePage * 28), start = dateOffset(end, -27);
  main.innerHTML = `<div class="page-heading"><div class="eyebrow"><span class="status-dot"></span>SIEMPRE QUEDA ALGO POR DESCUBRIR</div><h1>El archivo de vuelo.</h1><p>Vuelve a una fecha y encuentra sus siete señales. El archivo es para explorar: no modifica tu racha diaria.</p></div><div class="archive-period"><h2>${esc(shortDate(start))} — ${esc(shortDate(end))}</h2><div><button class="secondary" data-action="archive-older" aria-label="Ver 28 días anteriores">← Anteriores</button><button class="secondary" data-action="archive-newer" ${store.archivePage === 0 ? 'disabled' : ''}>Recientes →</button></div></div><div class="calendar">${Array.from({ length: 28 }, (_, i) => { const date = dateOffset(end, -i), edition = dailyMission(date).dataVersion, saved = store.runs[keyFor('archive', date) + ':' + edition] || store.runs[keyFor('daily', date) + ':' + edition] || store.runs[keyFor('archive', date)] || store.runs[keyFor('daily', date)]; return `<a class="calendar-day" href="#archive/${date}"><span class="date">${Number(date.slice(8))}</span><span class="month">${esc(new Intl.DateTimeFormat('es-ES', { month: 'short', year: 'numeric' }).format(new Date(date + 'T12:00:00Z')))}</span>${saved?.phase === 'done' ? `<span class="saved-score">${totalScore(saved)} / 700 ✓</span>` : `<span class="play">${saved && saved.phase !== 'intro' ? 'Continuar' : 'Abrir misión'} ↗</span>`}</a>`; }).join('')}</div><p class="archive-note">Cada fecha tiene siete preguntas fijadas para todos los jugadores, también al ampliar el repertorio. Las fechas anteriores al lanzamiento son misiones de práctica, no partidas históricas de otros jugadores. Cada fecha tiene un único registro local de archivo.</p>`;
}
function statsScreen() {
  const all = completed(), daily = [...new Map(all.filter(r => r.mode === 'daily').sort((a, b) => a.dataVersion.localeCompare(b.dataVersion)).map(r => [r.seed, r])).values()], streak = streaks(all), best = daily.length ? Math.max(...daily.map(totalScore)) : 0, avg = daily.length ? Math.round(daily.reduce((s, r) => s + totalScore(r), 0) / daily.length) : 0;
  const histogram = [0, 0, 0, 0, 0, 0, 0]; for (const r of daily) histogram[Math.min(6, Math.floor(totalScore(r) / 100))]++;
  const max = Math.max(1, ...histogram);
  main.innerHTML = `<div class="page-heading"><div class="eyebrow"><span class="status-dot"></span>TUS PALABRAS DEJAN HUELLA</div><h1>Cuaderno de vuelo.</h1><p>Tus expediciones, tus descubrimientos. Guardado en este navegador; puedes exportarlo desde Ajustes.</p></div><div class="stats-grid"><div class="stat"><b>${streak.current}</b><span>Racha actual · días</span></div><div class="stat"><b>${streak.best}</b><span>Mejor racha · días</span></div><div class="stat"><b>${daily.length}</b><span>Misiones diarias completadas</span></div><div class="stat"><b>${best}</b><span>Mejor puntuación diaria</span></div></div><div class="stats-split"><section><h2>Tu altura habitual.</h2><p class="smallprint">Media diaria: ${avg} / 700 · Solo tus propias partidas, sin percentiles inventados.</p>${daily.length ? `<div class="histogram" aria-label="Distribución de tus puntuaciones diarias">${histogram.map((n, i) => `<div style="--height:${n / max * 100}%"><span>${n}</span><small>${i * 100}–${i === 6 ? 700 : i * 100 + 99}</small></div>`).join('')}</div>` : '<div class="empty-state">Tu primera misión diaria inaugurará este gráfico.</div>'}</section><section><h2>Una nave con historia.</h2><p class="smallprint">Completa días consecutivos para conseguir nuevas pinturas. Los logros cuentan tu mejor racha.</p><div class="badges">${outfits.map(o => `<div class="earned-badge ${streak.best < o.days ? 'locked' : ''}"><span>${o.symbol}</span><b>${o.name}</b><small>${o.days ? o.days + ' DÍAS' : 'TUYA'}</small></div>`).join('')}</div><button class="text-button" data-action="wardrobe">Elegir mi nave ↗</button></section></div><div class="section-label"><span class="mono">ÚLTIMAS EXPEDICIONES</span><p>${all.length} ${all.length === 1 ? 'misión' : 'misiones'} · ${all.reduce((n, r) => n + r.results.filter(a => a.tier === 'gem').length, 0)} joyas encontradas</p></div>${all.length ? `<div style="padding-bottom:35px">${Object.entries(store.runs).filter(([, r]) => r.phase === 'done').sort((a, b) => (b[1].completedAt || 0) - (a[1].completedAt || 0)).slice(0, 16).map(([key, r]) => `<button class="history-item" data-action="history" data-key="${esc(key)}" style="width:100%;border:0;border-bottom:1px solid var(--line);background:transparent;text-align:left"><span>${esc(modeName(r))} · ${esc(modeDetail(r))}</span><b style="font-weight:400;color:var(--gold)">${totalScore(r)} / 700 ↗</b></button>`).join('')}</div>` : '<div class="empty-state">Tu historia empieza con una palabra. <a href="#daily" class="source-link">Inicia tu primera misión ↗</a></div>'}`;
}
function render() {
  document.querySelectorAll('[data-nav]').forEach(a => { const active = a.dataset.nav === route || a.dataset.nav === 'packs' && route.startsWith('pack/') || a.dataset.nav === 'archive' && route.startsWith('archive/'); a.classList.toggle('active', active); if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  if (route === 'packs') packsScreen(); else if (route === 'archive') archiveScreen(); else if (route === 'stats') statsScreen();
  else if (run) { if (run.phase === 'intro') landing(); else if (run.phase === 'done') resultScreen(); else gameScreen(); }
  else { location.hash = '#daily'; }
}
function navigate() {
  save(); route = location.hash.slice(1) || (challenge ? 'challenge' : 'daily');
  if (route === 'catalog' || route.startsWith('catalog/')) { route = 'daily'; history.replaceState(null, '', '#daily'); }
  if (dialog.open) dialog.close();
  routeRun(); render(); window.scrollTo({ top: 0, behavior: 'instant' });
}
function openModal(title, content) {
  modalReturnFocus = document.activeElement;
  $('.modal-content', dialog).innerHTML = `<div class="modal-top"><h2 id="modal-title">${title}</h2><button data-action="close-modal" aria-label="Cerrar ventana">×</button></div>${content}`;
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
}
function help() {
  openModal('Tu guía de vuelo.', `<div class="eyebrow">SIETE SEÑALES PARA PENSAR DIFERENTE</div><div class="checklist"><div><span class="mono">01</span><span>Recibes una categoría y tienes <strong>3 segundos de preparación</strong>, seguidos de <strong>25 segundos para escribir una respuesta</strong>.</span></div><div><span class="mono">02</span><span>Escribe algo que encaje y pulsa Enter. Solo se guarda <strong>una respuesta aceptada</strong> por señal. Si no está en el repertorio, puedes volver a intentarlo antes de que se agote el tiempo.</span></div><div><span class="mono">03</span><span><strong>Las respuestas menos familiares en España puntúan más.</strong> Cada punto suma 10 kilómetros a tu viaje. Siete joyas de 100 puntos hacen una misión perfecta: 700 puntos.</span></div></div>${rarityGrid()}<p>La escala actual tiene cinco niveles: <strong>10, 30, 60, 85 y 100 puntos</strong>. Puede haber varias respuestas de 100 puntos. Las partidas antiguas conservan sus reglas y el nivel editorial de 15 puntos.</p><p>Al terminar el diario verás tres respuestas de mayor puntuación de cada una de sus siete preguntas. Las soluciones aparecen solo cuando completas la misión.</p><p>Las tildes y las mayúsculas no importan. La <strong>ñ</strong> es una letra distinta. Se aceptan las variantes recogidas en cada categoría. Las correcciones de una errata requieren que las confirmes y el reloj sigue corriendo.</p><p>Al llegar a cero se comprueba lo que hayas escrito. Si no hay una respuesta válida, sumas 0. Entre señales puedes respirar: el reloj se detiene hasta que pulses «Siguiente señal».</p><div class="notice">Una misión diaria por fecha, compartida por todo el mundo, con cambio de día a medianoche de Madrid. La recarga conserva tu partida y el tiempo transcurrido; los menús tampoco detienen el reloj.</div><p>En <strong>Sin límites</strong> puedes seguir explorando. Las <strong>Constelaciones</strong> reúnen temas concretos y el <strong>Archivo</strong> te deja visitar otras fechas. Solo las misiones diarias cuentan para la racha.</p><button class="primary" data-action="close-modal" style="margin-top:15px">Entendido, capitana ↗</button>`);
}
function sources() { openModal('La rareza, vista desde España.', sourcePanel(data, categories.filter(c => !c.legacy).length)); }

function settings() {
  openModal('Ajustes de cabina.', `<p class="smallprint">El tiempo de una señal activa sigue corriendo mientras este panel está abierto.</p>${[
    ['sound', 'Sonido de cabina', 'Señales suaves al transmitir y cuando queda poco tiempo.'],
    ['corrections', 'Ayuda con erratas', 'Sugiere una corrección si solo hay una coincidencia a una letra de distancia. Tú la confirmas.'],
    ['clearRejected', 'Vaciar respuestas rechazadas', 'Deja la casilla libre para tu siguiente idea.'],
    ['reducedMotion', 'Movimiento reducido', 'Desactiva el movimiento de la ilustración y las transiciones.']
  ].map(([key, label, description]) => `<label class="setting-row"><span><b>${label}</b><small>${description}</small></span><input class="switch" type="checkbox" data-setting="${key}" ${store.settings[key] ? 'checked' : ''} aria-label="${label}"></label>`).join('')}<div class="setting-row"><span><b>Tu nave</b><small>Pinturas que se consiguen con la racha diaria.</small></span><button class="secondary" data-action="wardrobe">Elegir ↗</button></div><h3>Llévate tu cuaderno</h3><p>La partida se guarda en este navegador. Exporta una copia para conservarla o llevarla a otro dispositivo. Al importar, se combinan los registros; las misiones ya completadas en este navegador se conservan.</p><div class="inline-actions"><button class="secondary" data-action="export">Exportar cuaderno ↓</button><button class="secondary" data-action="import">Importar cuaderno ↑</button><input type="file" accept="application/json,.json" id="import-file" class="hidden" aria-label="Importar cuaderno JSON"></div><p class="smallprint">No se envían tus respuestas a un servidor. El juego puede funcionar sin conexión una vez guardado desde un servidor local; todos los recursos están incluidos en el proyecto.</p>`);
}
function wardrobe() {
  const best = streaks(completed()).best;
  openModal('Una nave muy tuya.', `<p>Tu mejor racha desbloquea nuevas pinturas. Elige la que te acompañará en la próxima señal.</p><div class="outfit-options">${outfits.map(o => `<button class="secondary" data-action="outfit" data-outfit="${o.id}" aria-pressed="${store.settings.outfit === o.id}" ${best < o.days ? 'disabled' : ''}><span style="color:${o.color}">${o.symbol}</span>${o.name}${best < o.days ? ` · ${o.days} días` : ''}</button>`).join('')}</div><p class="smallprint">Las misiones de archivo, los retos y el modo Sin límites no aumentan la racha.</p>`);
}
function shareText() { return `ÓRBITA · ${modeName()} ${modeDetail()}\n${run.results.map(r => TIERS[r.tier].emoji).join('')}\n${totalScore(run)} / 700 puntos · ${fmt(totalScore(run) * 10)} km\nLas palabras raras llegan más lejos.`; }
async function copy(text, success = 'Copiado al portapapeles.') {
  try { await navigator.clipboard.writeText(text); toast(success); }
  catch { openModal('Listo para compartir.', `<p>Selecciona y copia el texto de tu expedición.</p><div class="share-text" tabindex="0">${esc(text)}</div>`); }
}
function makeChallengeLink() {
  const payload = { v: 1, data: run.dataVersion, seed: run.seed, pack: run.pack, score: totalScore(run) };
  const base = new URL(location.href); base.search = ''; base.hash = 'challenge';
  base.searchParams.set('reto', btoa(JSON.stringify(payload)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, ''));
  return base.href;
}
function readChallenge() {
  const encoded = new URLSearchParams(location.search).get('reto');
  if (!encoded) return null;
  try {
    if (encoded.length > 1500) throw new Error();
    const value = JSON.parse(atob(encoded.replaceAll('-', '+').replaceAll('_', '/')));
    if (value.v !== 1 || !SUPPORTED_VERSIONS.has(value.data) || typeof value.seed !== 'string' || !/^[a-z0-9-]{1,60}$/i.test(value.seed) || !PACKS[value.pack] || !Number.isInteger(value.score) || value.score < 0 || value.score > 700) throw new Error();
    return value;
  } catch { toast('Este reto no es válido o usa otra versión del repertorio.'); return null; }
}
function exportData() {
  save(); const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' }), url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = `orbita-cuaderno-${today()}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('Cuaderno exportado.');
}
async function importData(file) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { toast('El archivo es demasiado grande (máximo 5 MB).'); return; }
  try {
    const value = JSON.parse(await file.text());
    if (value.schema !== 1 || !value.runs || typeof value.runs !== 'object') throw new Error();
    const imported = loadStore(value); let added = 0;
    for (const [key, r] of Object.entries(imported.runs)) {
      const existing = store.runs[key];
      if (!existing || existing.phase !== 'done' && r.phase === 'done') { store.runs[key] = r; added++; }
    }
    if (currentKey && store.runs[currentKey]) run = advanceClock(store.runs[currentKey], categories);
    save(); render(); toast(`${added} expediciones incorporadas a tu cuaderno.`);
  } catch { toast('No se ha podido leer este cuaderno. Usa un archivo JSON exportado desde Órbita.'); }
}
function updateCountdown() {
  const element = $('#next-daily-countdown'); if (!element) return;
  // Find the next Madrid civil midnight using a monotonic search, including DST transitions.
  let low = Date.now(), high = low + 27 * 3600000; const currentDate = madridDate(low);
  for (let i = 0; i < 22; i++) { const mid = Math.floor((low + high) / 2); if (madridDate(mid) === currentDate) low = mid; else high = mid; }
  const secs = Math.max(0, Math.ceil((high - Date.now()) / 1000));
  element.textContent = `En ${String(Math.floor(secs / 3600)).padStart(2, '0')}:${String(Math.floor(secs / 60) % 60).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}.`;
}
document.addEventListener('click', async event => {
  if (event.target.closest('.skip-link')) { event.preventDefault(); main.focus(); return; }
  const button = event.target.closest('[data-action]'); if (!button || !categories) return;
  const action = button.dataset.action;
  if (action === 'today-daily') { route = 'daily'; location.hash = '#daily'; routeRun(); render(); }
  else if (action === 'launch') { run = startRound(run); save(); sound(); render(); }
  else if (action === 'continue') { if (run.results.length === ROUNDS) finishMission(); else { run = startRound(run); save(); render(); } }
  else if (action === 'skip') { run = advanceClock(run, categories); if (run.phase === 'answering') run = finishRound(run, { accepted: false, skipped: true }, run.draft); save(); sound('miss'); render(); }
  else if (action === 'suggest') submitAnswer(button.dataset.value, true);
  else if (action === 'help') help();
  else if (action === 'sources') sources();
  else if (action === 'settings') settings();
  else if (action === 'stats') location.hash = '#stats';
  else if (action === 'close-modal') dialog.close();
  else if (action === 'next-unlimited') { store.unlimited++; save(); if (route === 'unlimited') { routeRun(); render(); } else location.hash = '#unlimited'; window.scrollTo({ top: 0 }); }
  else if (action === 'next-chapter') { const chapter = Math.min(30, Number(run.seed.split('-').at(-1)) + 1); if (chapter === Number(run.seed.split('-').at(-1))) { location.hash = '#packs'; toast('Has llegado al último capítulo de esta constelación.'); } else location.hash = `#pack/${run.pack}/${chapter}`; }
  else if (action === 'archive-older') { store.archivePage++; render(); }
  else if (action === 'archive-newer') { store.archivePage = Math.max(0, store.archivePage - 1); render(); }
  else if (action === 'wardrobe') wardrobe();
  else if (action === 'outfit') { if (outfits.find(o => o.id === button.dataset.outfit)?.days <= streaks(completed()).best) { store.settings.outfit = button.dataset.outfit; save(); wardrobe(); } }
  else if (action === 'export') exportData();
  else if (action === 'import') $('#import-file')?.click();
  else if (action === 'share') await copy(shareText(), 'Resultado copiado. Listo para compartir sin spoilers.');
  else if (action === 'challenge-link') { const link = makeChallengeLink(); await copy(link, 'Enlace del reto copiado.'); if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') toast('Reto copiado. El enlace solo funciona donde este servidor sea accesible.'); }
  else if (action === 'history') { if (store.runs[button.dataset.key]) location.hash = `#log/${encodeURIComponent(button.dataset.key)}`; }
});
document.addEventListener('submit', event => {
  if (event.target.id === 'answer-form') { event.preventDefault(); submitAnswer($('#answer').value); }
});
document.addEventListener('input', event => {
  if (event.target.id === 'answer' && run?.phase === 'answering') { run.draft = event.target.value; save(); }
});
document.addEventListener('change', event => {
  if (event.target.dataset.setting) { store.settings[event.target.dataset.setting] = event.target.checked; applySettings(); save(); if (event.target.dataset.setting === 'sound') sound(); }
  if (event.target.id === 'chapter-select') location.hash = `#pack/${run.pack}/${event.target.value}`;
  if (event.target.id === 'import-file') importData(event.target.files[0]);
});
dialog.addEventListener('click', event => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close(); } });
dialog.addEventListener('close', () => modalReturnFocus?.isConnected && modalReturnFocus.focus({ preventScroll: true }));
window.addEventListener('hashchange', navigate);
window.addEventListener('pagehide', save);
window.addEventListener('storage', event => {
  if (event.key !== KEY || !event.newValue || !categories) return;
  try {
    const incoming = loadStore(JSON.parse(event.newValue));
    store.unlimited = Math.max(store.unlimited, incoming.unlimited);
    // Never let a stale tab replace a completed mission with a partial run.
    for (const [key, r] of Object.entries(incoming.runs)) if (store.runs[key]?.phase !== 'done' && (r.phase === 'done' || !store.runs[key] || r.results.length > store.runs[key].results.length)) store.runs[key] = r;
    if (currentKey && store.runs[currentKey]?.phase === 'done' && run?.phase !== 'done') { run = store.runs[currentKey]; render(); }
  } catch { /* Ignore unrelated or damaged storage events. */ }
});

async function init() {
  try {
    const responses = await Promise.all([fetch('./data.json?v=4.1', { cache: 'no-cache' }), fetch('./repertory.json?v=4.1', { cache: 'no-cache' }), fetch('./focused-repertory.json?v=4.1', { cache: 'no-cache' })]);
    if (responses.some(response => !response.ok)) throw new Error('No se ha podido cargar el repertorio.');
    const [base, curated, focused] = await Promise.all(responses.map(response => response.json()));
    if (base.version !== DATA_VERSION || curated.version !== CURATED_VERSION || focused.version !== DATA_VERSION) throw new Error('Actualización incompleta. Recarga la página.');
    data = { ...base, curated, focused }; categories = buildCategories(data); byId = new Map(categories.map(c => [c.id, c]));
    try { store = loadStore(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch { store = defaults(); }
    applySettings(); challenge = readChallenge(); navigate();
    setInterval(() => {
      if (run && ['preview', 'answering'].includes(run.phase)) {
        const next = advanceClock(run, categories);
        if (next !== run) { const previous = run.phase; run = next; save(); if (run.phase === 'feedback') { sound(run.results.at(-1).tier); if (dialog.open) dialog.close(); } render(); if (previous === 'preview') lastTimerSecond = -1; }
        else updateTimer();
      }
    }, 100);
    setInterval(() => {
      const date = today();
      if (date !== lastDay) { lastDay = date; if (route === 'daily' && ['intro', 'done'].includes(run?.phase)) { routeRun(); render(); toast('Una nueva misión diaria acaba de llegar.'); } }
      updateCountdown();
    }, 1000);
  } catch (error) {
    const loadHelp = location.protocol === 'file:' ? 'Para jugar en tu ordenador, ejecuta <code>npm start</code> en la carpeta orbita y visita http://localhost:4173.' : 'No se ha podido descargar el repertorio. Comprueba tu conexión y vuelve a intentarlo.';
    main.innerHTML = `<div class="loading"><p>No hemos podido preparar la misión.</p><p class="smallprint">${loadHelp}</p><button class="secondary" id="retry-load">Volver a intentar ↗</button></div>`;
    $('#retry-load').addEventListener('click', () => location.reload()); console.error(error);
  }
}
init();
