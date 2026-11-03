# Publicar Turbo en Cloudflare

El juego usa **Cloudflare Workers con Static Assets** y **D1** para guardar nombres reservados, mejores marcas e intentos. El enlace será abierto para cualquiera que lo tenga. No necesita que la computadora de la oficina permanezca encendida.

## Primera publicación desde GitHub

1. Crear una base de datos D1 llamada `turbo-ranking` en Cloudflare y copiar su ID.
2. Sustituir el ID de ejemplo de `wrangler.jsonc` por ese ID. También se puede definir `TURBO_DATABASE_ID` como variable del proceso de compilación: `npm run build` la aplica a la configuración.
3. En **Workers & Pages**, crear un Worker conectado al repositorio `rodrigobarbosa-prog/truboGame`, rama `main`.
4. Nombre del Worker: `turbo-wpp`. Comando de compilación: `npm run build`. Comando de publicación: `npm run cloudflare:migrate && npx wrangler deploy`.
5. La dirección `workers.dev` que devuelve Cloudflare es el enlace para compartir. Un dominio propio es opcional.

No se debe usar una publicación puramente estática: el ranking necesita el Worker y la base D1. Las migraciones crean las tablas sin borrar datos existentes. La subida automática de ramas de prueba debe usar otra base D1 si se habilita en el futuro.

## Publicación desde esta computadora

Después de configurar el ID de D1:

```powershell
npm install
npm run cloudflare:login
npm run cloudflare:deploy
```

El inicio de sesión abre Cloudflare para autorizar Wrangler. No guardar contraseñas ni tokens en el repositorio.

## Qué se publica

La carpeta `dist/` contiene únicamente `index.html`, `style.css`, `src/` y `vendor/`. La lógica del ranking se publica como código del Worker. La carpeta `data/`, los respaldos, las capturas y las fotos de referencia no se suben al repositorio ni se sirven como archivos públicos.

El servidor local (`node server.mjs`) sigue funcionando como antes. Su ranking y el de Cloudflare son bases independientes. El archivo local `data/players.json` se conserva y no se migra automáticamente. Los nombres se reservan nuevamente en la versión web; si se necesita conservar las marcas anteriores, hay que realizar una migración privada de esos datos.

## Comprobaciones locales

`npm test` comprueba el juego y la API del ranking. Las pruebas de Cloudflare usan SQLite en memoria (Node.js 24). `npx wrangler deploy --dry-run` verifica el paquete sin publicarlo.

La edición pública conserva el sistema de puntaje del prototipo: el navegador informa su avance. No debe utilizarse como clasificación verificada para premios o competiciones con dinero.
