import{cp,mkdir,copyFile,rm,readFile,writeFile}from'node:fs/promises';
import path from'node:path';
// Deliberately copy only runtime files. Never publish data/, reference photos,
// backups, server source, test fixtures or repository metadata as web assets.
const target=path.resolve('dist');
if(path.dirname(target)!==process.cwd())throw Error('La carpeta de salida debe estar dentro del proyecto.');
await rm(target,{recursive:true,force:true});await mkdir(target,{recursive:true});
if(process.env.TURBO_DATABASE_ID){
  if(!/^[a-f0-9-]{36}$/i.test(process.env.TURBO_DATABASE_ID))throw Error('TURBO_DATABASE_ID no es válido.');
  const config=JSON.parse(await readFile('wrangler.jsonc','utf8'));config.d1_databases[0].database_id=process.env.TURBO_DATABASE_ID;
  await writeFile('wrangler.jsonc',JSON.stringify(config,null,2)+'\n');
}
for(const file of['index.html','style.css'])await copyFile(file,`dist/${file}`);
for(const directory of['src','vendor'])await cp(directory,`dist/${directory}`,{recursive:true});
console.log('Juego preparado en dist/. El ranking local y las fotos de referencia quedan fuera.');
