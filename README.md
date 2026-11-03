# Turbo — A paso lento

Prototipo web 3D de la fuga del caracol de WPP Production. Viernes, **18:08**, piso 14. La meta sigue siendo la calle, en planta baja, antes de que pasen 48 horas de juego.

## Jugar en este equipo

Abrí **Iniciar juego.cmd** y entrá en **http://localhost:4173**. También podés ejecutar `npm start` o `node server.mjs` desde esta carpeta.

Necesita Node.js (20 o superior) y un navegador con WebGL 2. Three.js 0.180.0 está incluido en `vendor/`, con su licencia MIT: no hace falta instalar paquetes ni tener Internet para jugar. No abras `index.html` directamente: los módulos y el ranking necesitan el servidor.

## Compartir en la ofi

1. Detené el servidor local anterior con Ctrl+C.
2. Abrí **Compartir en la ofi.cmd** en un equipo que quede encendido.
3. Compartí la dirección que aparece como **En la ofi**, por ejemplo `http://192.168.1.20:4173`.
4. Todos deben entrar a esa misma dirección, desde la misma red. Si Windows pide acceso a la red, permitilo solo en la red de oficina que corresponda. Las políticas de la red de la empresa pueden impedir conexiones entre equipos.

## Jugadores y ranking

El ranking se ve directamente, en grande, en la portada. Antes de empezar se pide un nombre de jugador y el servidor lo reserva: mayúsculas, minúsculas y espacios equivalentes no permiten tomar un nombre ya reservado. El navegador conserva una clave privada que permite reconocer al jugador al volver; el servidor guarda únicamente su hash. La clave nunca aparece en la tabla pública. El botón **Otro jugador** permite ingresar otro nombre y conserva las reservas anteriores en ese navegador.

El puntaje corresponde al **mayor avance alcanzado**, incluso en partidas incompletas:

- Hoja, repisa y rampa: 0–1.000 puntos.
- Pasillo 1: 1.000–1.600 puntos.
- Pasillo 2: 1.600–2.600 puntos.
- Fuera de la oficina, todavía en piso 14: 2.600–2.800 puntos.
- Escaleras, desde el piso 14 hasta PB: 2.800–9.500 puntos.
- Hall de planta baja: hasta 9.900 puntos.
- Salida a la calle: 10.000 puntos.

El orden es por avance descendente. El menor tiempo hasta ese avance solo desempata. Se conserva la mejor marca entre todos los intentos; una partida peor no la reemplaza. El progreso se envía aproximadamente cada dos segundos y al pausar, volver a portada o cerrar la página. Una caída termina inmediatamente el intento y detiene el reloj. La bajada corta desde la hoja hasta la repisa y el descenso normal de escalones o de la bajada final son seguros; desprenderse del vidrio desde demasiada altura también cuenta como caída. Si falla la conexión, queda pendiente en el navegador para reintentar. La portada actualiza la tabla automáticamente y también tiene un botón Actualizar. Una partida en curso no recupera la posición al cerrar la página; sí conserva su mejor avance.

Cada caída, fin del tiempo o escape guarda un intento individual con su avance, duración y motivo. Los intentos repetidos por un reintento de conexión no se duplican. El ranking sigue mostrando la mejor marca del jugador, aunque un nuevo intento termine antes. Los intentos pendientes se reenvían al recuperar conexión.

Las reservas, marcas e intentos se guardan en **data/players.json**, compartidas por todos los que usan el mismo servidor. Respaldá ese archivo para conservar nombres y puntos. Los rankings anteriores basados solo en tiempo permanecen intactos en data/ranking.json y no se mezclan con los puntos. No hay recuperación automática de una reserva desde otro equipo si no se conserva su clave: usá el mismo navegador y la misma dirección del servidor. Es un ranking amistoso de prototipo; la simulación sigue ejecutándose en el cliente.

## Recorrido actual — mapa del piso 14

1. La planta de inicio mantiene su posición confirmada, en el extremo derecho de los ventanales.
2. Se recorre el bordecito siguiendo tres lados de la oficina. En la esquina indicada está la **rampa amarilla**, antes del último tramo.
3. La rampa desemboca en **pasillo 1**, que se recorre a lo largo del fondo de la oficina hasta la flecha de cambio de nivel.
4. La oficina, los pasillos 1 y 2 y el hall de ascensores forman un único espacio físico continuo del **piso 14**: se puede cruzar y volver sin cargar otra escena. Una mancha grande e irregular de café bloquea el paso derecho en el pasillo 2. Se puede rodear por los escritorios o trepar por la pared; el peligro sigue el contorno visible de la mancha. Luego las flechas llevan alrededor de los escritorios y de regreso a la doble puerta de madera de la pared derecha.
5. Hay que trepar a un escritorio del medio y recoger con E la tarjeta de acceso de Aguada Park. Sin ella, la puerta pide buscarla; con ella, E abre las dos hojas de madera. Se cruza caminando al hall del **piso 14**: frente de madera al salir, giro a la derecha hacia la fila de ascensores y escaleras al fondo del corredor, según las fotos.
6. Desde ese corredor se llega a las escaleras del edificio. Recién al descender empieza a bajar el número de piso.

E sigue permitiendo pegarse al vidrio y despegarse. Una caída termina el intento y registra su avance; reintentar vuelve a la planta. Los nuevos pasillos no reinician el reloj.

## Colisiones de objetos

Macetas, hojas, tallos, escritorios, sillas, muebles, monitores y demás objetos físicos incorporan volúmenes de colisión derivados de su geometría y orientación. Sus superficies también se pueden pisar cuando la altura lo permite. La rampa usa su pendiente real para movimiento y colisión. Las colisiones se aplican al movimiento sobre el suelo y al desplazamiento adherido al vidrio. Las señales pintadas, efectos de luz y gotas coleccionables no son barreras físicas.

## Controles

| Acción | Control |
|---|---|
| Mover | WASD / flechas, según la cámara en el suelo |
| Subir/bajar sobre el vidrio | W/S; A/D a los lados |
| Cámara | Arrastrar el mouse; rueda para acercar/alejar |
| Saltar obstáculos pequeños | Espacio (en el suelo) |
| Impulso temporal | Shift |
| Adherirse a vidrio, paredes y objetos / soltarse / usar puertas | E |
| Pausa | Esc |

Hay botones táctiles, calidad gráfica ligera y sonido opcional. Las gotas de agua rellenan impulso y recuperan 20 minutos de juego. **48 horas de juego equivalen a 12 minutos reales**. El reloj y el tiempo del ranking se detienen durante las pausas o al cambiar de pestaña. La cinemática inicial tampoco cuenta.

## Archivos

- `src/main.js`: controles, cámara, adhesión al vidrio, reloj, cinemáticas e interfaz.
- `src/world.js`: oficina, caracol, repisas, escaleras y planta baja, construidos con geometría procedural.
- `src/rules.js`: reglas físicas y recorrido de la repisa.
- `src/ranking.js`, `leaderboard.mjs`, `server.mjs`: ranking compartido y servidor local.
- `assets/oficina-original.png`, `assets/storyboard.png`: referencias originales conservadas para desarrollo; ya no aparecen en la portada.

La oficina se interpreta a partir de la foto inicial y de las cuatro fotos nuevas: repisa con pequeñas macetas, vista al puerto, ventanales en esquina, columna multicolor, filas de monitores, máquinas expendedoras, kitchenette y el pasillo de Making ideas happen. Las proporciones siguen siendo aproximadas: no hay un plano medido. El estilo actual es geométrico, sin modelos fotorealistas. Las personas y las pantallas de las fotos no se reproducen como texturas en el juego.

Las filas se modelan como mesas corridas completas de seis puestos: una sola tapa continua, tres puestos a cada lado y estructura compartida. Se conserva el sentido longitudinal indicado en las capturas. El puesto exterior marcado gira 90° para que quien se siente mire hacia afuera; detrás se ubica la columna y continúa la mesa larga de seis puestos. Las superficies y las partes de cada puesto conservan sus colisiones.

## Validación

`npm test` verifica reloj, colisiones, continuidad de las 14 plantas, continuidad de la repisa y movimiento libre sobre el vidrio y reserva exclusiva de nombres, autorización de marcas y conservación del mejor avance. `npm run check` verifica sintaxis. La documentación de referencia del motor está en [Three.js](https://threejs.org/docs/).

## Render y salida al menú

La pausa y la pantalla de resultado incluyen **Salir al menú principal**, guardando el avance antes de volver a la portada. Las cinemáticas también permiten salir al menú.

El render de calidad alta incorpora mapas locales de color y relieve, alfombra tejida, techo acústico, pintura rugosa, escritorios oscuros, cerámica, terracota, hojas con nervaduras y curvatura, piel húmeda y caparazón mate con vetas finas. La iluminación combina cielo frío, luz cálida baja, reflejos de entorno, sombras de contacto, oclusión ambiental, brillo suave, antialiasing y acabado de color. La calidad Ligera omite el posprocesado y las sombras dinámicas. Los módulos de Three.js usados están incluidos en vendor/addons y no necesitan Internet.

Estos cambios visuales se implementaron sin ejecutar pruebas ni abrir vistas de prueba, por indicación del usuario. El resultado sigue usando geometría procedural; no equivale al fotorealismo del storyboard conceptual.

El nuevo recorrido usa la versión floor14-passages-v4. Los nombres siguen reservados y las marcas anteriores se archivan en previousBests al registrar avance en la nueva ruta. La tabla compara solamente puntos del recorrido actual. Los mapas de referencia están conservados en assets/mapa-oficina.png y assets/mapa-pasillo2.png. No se ejecutaron pruebas para estos cambios, por indicación del usuario.

## Turbo y trepada de objetos

El protagonista se llama **Turbo**; el nombre reservado de cada jugador sigue siendo independiente. Su caparazón es opaco y mate: sin barniz y con reflejos muy reducidos. La piel conserva un aspecto húmedo.

E permite adherirse a superficies verticales cercanas de paredes, escritorios, macetas, muebles y otros objetos físicos. W/S controlan la altura y A/D el desplazamiento lateral. Al llegar a un borde, Turbo pasa a la cara superior mediante una transición animada; también puede superar el pequeño voladizo de un escritorio. E lo suelta en su posición actual. El vidrio mantiene su funcionamiento anterior. La cámara se orienta según la cara escalada. La mano inicial incorpora palma, pulgar, dedos con tres articulaciones, nudillos, uñas, muñeca y manga, y abre el agarre antes de retirarse.

Cambios implementados sin ejecutar pruebas, por indicación del usuario.


Ubicación del conjunto señalado con flechas: el puesto exterior, la columna intermedia y su mesa corrida se trasladan juntos al otro lado de la columna multicolor, manteniendo sus orientaciones. La mesa que ocupaba ese destino pasa al área derecha, más al fondo, para evitar intersecciones. Las colisiones se generan a partir de las nuevas posiciones.

Ajuste de la pared del fondo según la última foto: la columna del conjunto se ubica junto al ventanal trasero, con gráfica magenta, amarilla y gris, parlante beige arriba y perchero delante. El puesto exterior está a su derecha, también contra la línea de los ventanales, mirando hacia afuera. Se reemplaza la columna gris que estaba adelantada; la mesa corrida continúa hacia el interior. El inicio de Turbo y las orientaciones de las mesas restantes se conservan.

Peligros del recorrido: el café termina el intento tras 1 segundo de contacto. Los bichitos son individuales, pequeños, camuflados y quitan 25 de vida por contacto. Alejarse reduce la exposición. El aviso indica el peligro y su porcentaje. Ambos motivos se registran junto al avance del intento. E busca una posición libre al soltar una superficie, conservando la altura y las reglas de caída.


Shift: velocidad extra reducida a la mitad; 1,8 m/s al caminar y 2,65 m/s con impulso. Al trepar, el multiplicador pasa de 1,6 a 1,3.


## Descenso: pisos 13 a planta baja

Las escaleras mantienen sus 336 peldaños y sus descansos continuos. Los pisos inferiores incorporan cajas, cables, café y enjambres, con espacio para evitarlos o trepar. Hay tres ambientes: depósitos, mantenimiento y servicios.

- Piso 12: subir a la caja, recoger el fusible con E y colocarlo en el panel para activar la emergencia y abrir la reja.
- Pisos 10 y 9: tramos oscuros. En el 10, liberar a Luma con E desde la caja es opcional: ilumina el camino y recupera 30 minutos del reloj.
- Piso 8: mantener E durante 2 segundos junto a la válvula. Soltar E interrumpe el cierre. La válvula libera la reja.
- Piso 7: oficina WPP de 27,5 × 24 m con tres pasillos conectados por extremos alternados. La pecera del último pasillo contiene el bol del Blé con ensalada vieja sobre la mesa; hay que trepar y recogerlo con E. Abre la reja y recupera 15 minutos del reloj. El merodeador muestra un cono de visión, patrulla, persigue al detectar y prepara un pisotón que se puede esquivar. Pierde el rastro tras 6 segundos sin ver a Turbo.
- Piso 4: trepar a las cajas y recoger con E la llave de planta baja.
- Planta baja: la puerta requiere emergencia activada, válvula cerrada, ensalada recuperada y llave. Después continúa la salida a la calle y la cinemática final.

Las misiones se reinician al comenzar un intento. Las caídas y los peligros mantienen las reglas existentes; el ranking sigue registrando hasta dónde llegó Turbo. La oficina y los pasillos 1 y 2 aprobados mantienen su distribución.

El pisotón termina el intento con el motivo `caught`; ser detectado inicia la persecución. La cinemática, la ensalada y la patrulla se reinician con cada intento. Turbo tiene 100 de vida: las arañas quitan 50 por picadura y los vidrios 20 por corte, con un segundo entre golpes. El café conserva su límite de un segundo; los bichitos quitan 25 de vida por contacto. Los motivos `spiders` y `glass` también se registran en el ranking.

Render: antialiasing también en los buffers del posprocesado, oclusión ambiental más suave y sin grano animado. Las mesas conservan sus posiciones; su textura reduce el detalle que producía parpadeo en movimiento.


Arañas colgantes: cinco arañas cubren el tramo de regreso de la repisa del piso 14, desde la esquina del ventanal hasta antes de la rampa. Cada una tiene un ciclo de 6,4 segundos desfasado respecto a las demás: pausa arriba, descenso, pausa de 1,5 segundos abajo y ascenso. El hilo no daña; el contacto con el cuerpo quita 50 de vida con el intervalo habitual entre golpes. Las marcas de la repisa avisan de la bajada y hay espacios seguros para esperar entre arañas.



Café: una silueta opaca continua y un borde separado, sin discos transparentes superpuestos. La mancha cubre las flechas del suelo. Insectos: cada uno elige su rumbo, velocidad y pausas por separado; evitan obstáculos y bordes y siguen los peldaños. Sin halo ni emisión verde. El intervalo compartido entre golpes se mantiene en un segundo.

