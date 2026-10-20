# Repertorio revisado de Órbita · edición 2026-10-19.3

## Alcance y comprobaciones

56 preguntas realmente diferentes, ocho por constelación. Todas tienen al menos 100 respuestas canónicas al ignorar tildes y mayúsculas; los alias, los plurales equivalentes y las variantes no cuentan para alcanzar el mínimo. Se retiran las preguntas repetidas de letras, terminaciones y longitudes del repertorio activo. El diccionario conserva las 231.944 claves documentadas de la edición anterior y añade vocabulario revisado, atestiguado en el léxico fuente, que carecía de encuesta de reconocimiento. Su puntuación se identifica como editorial y no modifica el diccionario de partidas antiguas.

La cobertura no depende de aparecer en una lista de popularidad reciente. Las preguntas culturales, deportivas y geográficas admiten temas de todo el mundo.

Revisión de cobertura del **20 de octubre de 2026**: se recorren todas las páginas de las categorías de Wikipedia mediante su [continuación oficial](https://www.mediawiki.org/wiki/API:Categorymembers), incluidas páginas intermedias sin resultados. Se amplían los países de procedencia, los años de obras culturales, las localidades y el vocabulario revisado. Esta revisión amplía las respuestas, sin cambiar los enunciados, las semillas de las misiones ni los periodos de las estadísticas. Las variantes flexionadas se aceptan cuando están documentadas; las formas femeninas automáticas se limitan a profesiones y gentilicios.

## Fuentes recientes verificadas en internet

- **Wikimedia Analytics:** país ES, proyecto es.wikipedia, todos los accesos; 48 listas diarias del **1 de septiembre al 18 de octubre de 2026**. Tras filtrar espacios de nombres, hay 2.555 señales de artículos; solo se puntúa como estadística reciente con al menos tres días publicados. Se suman los valores redondeados `views_ceil`. Un día no publicado es desconocido, nunca cero. No son visitas completas, lectores únicos, reconocimiento ni elecciones de jugadores. [API oficial](https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/reference/page-views.html).
- **INE:** publicación del **23 de abril de 2026**, referencia **1 de enero de 2025**, la última disponible al revisar la edición. Se conservan nombres y apellidos con frecuencia publicada >=20: 62.438 claves de nombres y 86.487 de apellidos. Se suman ambos sexos cuando coincide el nombre; los apellidos usan la frecuencia como primer apellido. [Últimos resultados oficiales](https://www.ine.es/dyngs/INEbase/operacion.htm?c=Estadistica_C&cid=1254736177009&idp=1254735572981&menu=resultados).

## Estimaciones identificadas

El usuario ha aceptado mantener cobertura amplia usando estimaciones editoriales cuando no hay datos recientes. El juego muestra **Estimación editorial · 2026** o **Editorial · referencia 2014–2017**. No se inventan mediciones de 2026.

SPALEX (Aguasvivas y colaboradores) aporta una referencia histórica del grupo nativo de España: `percent_nts` y `count_nts`, recogidos entre 2014 y 2017. No se mezclan las cohortes latinoamericanas. Se identifica la muestra; una flexión puede heredar la referencia del lema, que se indica en la respuesta. El reconocimiento de una forma escrita no mide todos sus significados.

Los listados explícitos revisados de vocabulario viven en `content/`. Se descartó la ampliación automática por subárboles traducidos de WordNet, por introducir acepciones y nombres científicos que no encajaban. Wikipedia/Wikidata y GeoNames aportan cobertura de nombres y lugares. La población y los enlaces mundiales no se usan como estadísticas de familiaridad en España. Las listas no son exhaustivas y pueden faltar respuestas válidas.

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

Las preguntas aparecen durante la partida. El resultado muestra únicamente lo que respondió el jugador y su puntuación; no ofrece listas de soluciones, ejemplos de 100 puntos ni un comprobador fuera de la partida. Los antiguos enlaces al catálogo llevan a la misión diaria.

## Reproducibilidad y mantenimiento

`dist/data.json` conserva las fuentes y preguntas antiguas; `dist/repertory.json` contiene la nueva edición, base de cada puntuación, metadatos de fechas y SHA-256. El formato compacto de cada respuesta es `[palabra, alias, puntos, base, valorPublicadoONull, diasONull, referenciaHistoricaONull]`.

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

Pruebas: límite mínimo en todas las categorías, 718 respuestas de jugadores distribuidas entre las 56 preguntas, alias y variantes habituales, exclusión de candidatos ajenos al enunciado, fechas y muestras, puntuación, capítulos, temporizadores, compatibilidad de partidas y paginación de fuentes con peticiones simuladas. La interfaz pública mantiene ocultas las listas de soluciones.
