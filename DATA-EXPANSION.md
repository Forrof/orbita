# Repertorio revisado de Órbita · edición 2026-10-20.4

## Alcance y comprobaciones

152 preguntas activas, frente a las 56 de la edición anterior. La pregunta general de interpretación admite 31.840 actores y actrices. Mobiliario y electrodomésticos se separan: 177 y 162 respuestas respectivamente. Todas tienen al menos 100 respuestas canónicas al ignorar tildes y mayúsculas; los alias, los plurales equivalentes y las variantes no cuentan para alcanzar el mínimo. Se retiran las preguntas repetidas de letras, terminaciones y longitudes del repertorio activo. El diccionario conserva las 231.944 claves documentadas de la edición anterior y añade vocabulario revisado, atestiguado en el léxico fuente, que carecía de encuesta de reconocimiento. Su puntuación se identifica como editorial y no modifica el diccionario de partidas antiguas.

La cobertura no depende de aparecer en una lista de popularidad reciente. Las preguntas culturales, deportivas y geográficas admiten temas de todo el mundo.

La primera revisión de cobertura del **20 de octubre de 2026**: se recorren todas las páginas de las categorías de Wikipedia mediante su [continuación oficial](https://www.mediawiki.org/wiki/API:Categorymembers), incluidas páginas intermedias sin resultados. Se amplían los países de procedencia, los años de obras culturales, las localidades y el vocabulario revisado. Esta revisión amplía las respuestas, sin cambiar los enunciados, las semillas de las misiones ni los periodos de las estadísticas. Las variantes flexionadas se aceptan cuando están documentadas; las formas femeninas automáticas se limitan a profesiones y gentilicios.

La segunda revisión de cobertura del mismo día registra las fuentes de **cada una de las 56 preguntas** en `content/category-source-audit.json`. Añade denominaciones compuestas, nombres cooficiales y variantes españolas de lugares, nomenclatura clínica de la CIE-10-ES 2026 y los símbolos de los 118 elementos confirmados. Las listas acotadas y los registros públicos se revisan sin inventar nuevas entradas para aumentar el tamaño. Los datos del INE conservan su umbral de publicación de 20 residentes; los países incluyen los constituyentes del Reino Unido, de acuerdo con el alcance amplio del enunciado.

## Cómo valida el juego de referencia

La [FAQ pública de Krillion](https://krillion.io/faq) describe conjuntos finitos de respuestas que se agregan desde diccionarios, páginas y enciclopedias, se limpian y se completan con alias. La rareza depende de la pregunta: usa datos de familiaridad cuando es posible, o asistencia de modelos y revisión manual. Reconoce que pueden faltar respuestas válidas. Su [política de privacidad](https://krillion.io/privacy) indica que comprueba cada respuesta en su servidor. El código privado y las colecciones completas no se conocen; no se presupone un validador universal de IA en cada jugada.

Órbita construye sus propios repertorios y los comprueba localmente para conservar el alojamiento estático en GitHub Pages. La validez se decide por pertenencia documentada al tema y alias revisados; la existencia de estadísticas es una cuestión independiente. Mover la comprobación a un servidor no ampliaría por sí solo la cobertura.

## Fuentes recientes verificadas en internet

- **Wikimedia Analytics:** país ES, proyecto es.wikipedia, todos los accesos; 48 listas diarias del **1 de septiembre al 18 de octubre de 2026**. Tras filtrar espacios de nombres, hay 2.555 señales de artículos; solo se puntúa como estadística reciente con al menos tres días publicados. Se suman los valores redondeados `views_ceil`. Un día no publicado es desconocido, nunca cero. No son visitas completas, lectores únicos, reconocimiento ni elecciones de jugadores. [API oficial](https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/reference/page-views.html).
- **INE:** publicación del **23 de abril de 2026**, referencia **1 de enero de 2025**, la última disponible al revisar la edición. Se conservan nombres y apellidos con frecuencia publicada >=20: 62.438 claves de nombres y 86.487 de apellidos. Se suman ambos sexos cuando coincide el nombre; los apellidos usan la frecuencia como primer apellido. [Últimos resultados oficiales](https://www.ine.es/dyngs/INEbase/operacion.htm?c=Estadistica_C&cid=1254736177009&idp=1254735572981&menu=resultados).

## Estimaciones identificadas

El usuario ha aceptado mantener cobertura amplia usando estimaciones editoriales cuando no hay datos recientes. El juego muestra **Estimación editorial · 2026** o **Editorial · referencia 2014–2017**. No se inventan mediciones de 2026.

SPALEX (Aguasvivas y colaboradores) aporta una referencia histórica del grupo nativo de España: `percent_nts` y `count_nts`, recogidos entre 2014 y 2017. No se mezclan las cohortes latinoamericanas. Se identifica la muestra; una flexión puede heredar la referencia del lema, que se indica en la respuesta. El reconocimiento de una forma escrita no mide todos sus significados.

Los listados explícitos revisados de vocabulario viven en `content/`. Se descartó la ampliación automática por subárboles traducidos de WordNet, por introducir acepciones y nombres científicos que no encajaban. Wikipedia/Wikidata y GeoNames aportan cobertura de nombres y lugares. La población y los enlaces mundiales no se usan como estadísticas de familiaridad en España. Las listas no son exhaustivas y pueden faltar respuestas válidas.

La CIE-10-ES de 2026 aporta categorías de diagnósticos y subcategorías generales de enfermedades, lesiones y síntomas. Se excluyen visitas, causas externas, estados administrativos, partos normales y rótulos inespecíficos. Se añaden variantes sin modificadores no esenciales entre paréntesis y sin siglas redundantes, siguiendo las convenciones de la clasificación. La terminología clínica no se usa como dato de popularidad ni la incidencia como reconocimiento. Los nombres comunes se revisan por separado.

El vocabulario del léxico inicial documentado además en Spanish Data / Wiktionary puede validarse aunque no tenga encuesta SPALEX. En el diccionario actual recibe una estimación editorial identificada: se conserva la revisión temática cuando existe, se asignan bandas a voces habituales revisadas y se usa provisionalmente la banda editorial de 60 puntos para el resto sin medición. No se usan sus frecuencias panhispánicas para simular estadísticas de España. Las partidas antiguas mantienen su diccionario anterior.

`scripts/import-topic-sources.py` recoge candidatos temáticos, pero no los aprueba automáticamente. Se revisan en `content/manual-topic-audit-20261020.json`; un artículo relacionado con un tema puede tratar una persona, un procedimiento o un evento que no responde al enunciado. El compilador comprueba las fuentes requeridas y conserva la procedencia y los hashes. El mínimo de 100 respuestas es un control de tamaño, no una garantía de exhaustividad.

## Puntuación

Cinco niveles: **10, 30, 60, 85, 100**. Un fallo suma 0. Las versiones antiguas conservan además el nivel editorial de 15 puntos. Puede haber varias respuestas de 100 puntos por pregunta; el máximo sigue siendo 700.

| Base | 10 puntos | 30 puntos | 60 puntos | 85 puntos | 100 puntos |
| --- | --- | --- | --- | --- | --- |
| INE, residentes | >=100.000 | >=20.000 | >=2.000 | >=100 | 20–99 |
| Referencia histórica de vocabulario, usada editorialmente | >=98 % | >=90 % | >=65 % | >=35 % | <35 % |
| Interés ES publicado, percentil de mayor a menor entre artículos con señal suficiente | primer 12 % | hasta 45 % | hasta 78 % | resto | selección editorial identificada |
| Estimación editorial sin dato reciente | muy habitual | familiar | poco habitual | muy poco habitual | especialmente rara |

Las excepciones manuales se etiquetan como editoriales aunque exista una señal de interés. No se presentan como resultados de una encuesta. Los empates de reconocimiento y de frecuencia mantienen la misma banda. Las selecciones de 100 puntos sin una frecuencia que las justifique se identifican como editoriales.

## Presentación pública

Las preguntas aparecen durante la partida. Solo al completar las siete rondas del diario se desbloquea una selección de tres respuestas de mayor puntuación de cada pregunta jugada, junto a la respuesta y puntuación del jugador. Los empates se indican y la procedencia de la rareza se etiqueta. No hay catálogo general ni comprobador fuera de la partida. Los antiguos enlaces al catálogo llevan a la misión diaria.

## Reproducibilidad y mantenimiento

`dist/data.json` conserva las fuentes y preguntas antiguas; `dist/repertory.json` conserva la edición compatible anterior, con la base de cada puntuación, fechas y SHA-256; `dist/focused-repertory.json` define las 152 preguntas activas mediante referencias y ampliaciones revisadas. El formato compacto de cada respuesta es `[palabra, alias, puntos, base, valorPublicadoONull, diasONull, referenciaHistoricaONull]`.

Para jugar, probar y desplegar se usan los ficheros incluidos: no hay API externa en tiempo de juego. Para mantener datos, con Python 3.12+, Node 22+ y PowerShell:

```powershell
python -m pip install --target .cache/python-tools -r requirements-data.txt
powershell -File scripts/import-ine.ps1
npm run data:refresh
npm test
python -m unittest discover -s tests -p '*_test.py'
npm run pages:build
```

La importación cachea las respuestas públicas, limita el ritmo y respeta Retry-After. INE usa HTTPS con validación de certificados. Borrar cachés y descargar fuentes dinámicas puede cambiar la selección: se debe emitir una nueva versión y revisar las pruebas deliberadamente. `content/questions.json` contiene el enunciado y los grupos de vocabulario; `manual-*.json` y `aliases.json` son las listas editables. El compilador falla si alguna categoría tiene menos de 100 respuestas y agrupa los alias antes de contar.

Versiones 1 y 2 siguen disponibles para historial y retos antiguos. Los resultados guardados no se recalculan. Las preguntas amplias antiguas de transporte, futbolistas y actores reciben las nuevas respuestas para corregir sus rechazos; en materiales naturales solo se incorporan sustancias que cumplen ese enunciado. Las nuevas partidas tienen claves separadas por edición. Las estadísticas diarias deduplican por fecha y las rachas cuentan días, no ediciones.

Pruebas: límite mínimo en todas las categorías, 718 respuestas de la edición anterior y 320 comprobaciones nuevas, con ejemplos revisados para las 152 preguntas activas, alias y variantes habituales, exclusión de candidatos ajenos al enunciado, fechas y muestras, puntuación, capítulos, temporizadores, compatibilidad de partidas y paginación de fuentes con peticiones simuladas. La interfaz oculta las alternativas hasta terminar el diario y limita su revelación a las siete preguntas jugadas.


## Preguntas concretas y diario compartido · cuarta edición

`content/focused-questions.json` define alcances concretos: mobiliario y electrodomésticos separados, interpretación por países y doblaje, cine por género o época, deportes, localidades por comunidad, ciudades por país y familias clínicas. Las pertenencias explícitas se recuperan de las categorías indicadas, sin aceptar automáticamente un árbol enciclopédico completo. Los grupos taxonómicos consultados se enumeran expresamente. Los nombres científicos pueden llevar nombres comunes españoles revisados.

`content/imported-focused-memberships.json` y `content/focused-source-manifest.json` conservan los títulos recuperados y las huellas de las peticiones. `content/focused-review.json` contiene revisión de nombres, alias, exclusiones y puntuaciones editoriales. `content/focused-source-audit.json` registra las fuentes por pregunta y los candidatos aplazados por no alcanzar 100 conceptos. No se publican preguntas con menos de 100 ni se completan las listas con nombres inventados.

Los registros descargados de GeoNames se procesan completos: se retira el límite anterior de las 10.000 ciudades y las 12.000 localidades españolas. Los filtros de país, comunidad y tipo geográfico determinan qué respuestas encajan; la población no determina los puntos.

El repertorio específico se guarda en `dist/focused-repertory.json`. Reutiliza respuestas canónicas del repertorio anterior mediante referencias por clave estable, conservando su evidencia española; añade registros documentados cuando faltan. Los alias no cuentan como respuestas adicionales. Los nombres nuevos sin señal española reciben una estimación editorial identificada. La cobertura mundial no se presenta como estadística de España.

`dist/daily-catalog.js` fija las ediciones y el orden de los conjuntos de preguntas que se sortean por fecha. La misma fecha selecciona las mismas siete preguntas para todos, independientemente del navegador, su historial, el orden de carga o ampliaciones posteriores de la base. La edición anterior se conserva hasta el 20 de octubre de 2026; la cuarta entra el 21 a medianoche de Madrid. Las preguntas nuevas se usan inmediatamente en los otros modos. El archivo conserva la selección de cada fecha.

Para futuras ediciones se debe añadir un periodo con fecha de inicio futura y conservar sin modificar los periodos publicados. Las versiones y los identificadores anteriores se mantienen para reproducir retos y partidas guardadas. Las puntuaciones ya registradas no se recalculan. El constructor de Pages rechaza un calendario de prueba o bancos incompatibles.

Las relaciones entre categorías se declaran expresamente: una respuesta válida de una subcategoría también entra en su categoría general, sin convertir automáticamente todo uso de evidencia compartida en una pertenencia. Por ejemplo, filósofos y científicos pueden compartir referencias de un nombre, pero los filósofos no se añaden indiscriminadamente a científicos. Las preguntas generales históricas compatibles incorporan los nuevos nombres y alias, conservando la puntuación de los resultados ya registrados. Los artículos sobre técnicas, equipamiento, asociaciones o edificios se excluyen de las listas de instancias.
