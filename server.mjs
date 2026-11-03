import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { networkInterfaces } from 'node:os';
import { createLeaderboard } from './leaderboard.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '127.0.0.1';
const leaderboard = createLeaderboard(process.env.SNAIL_DATA_DIR || path.join(root,'data'));
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.mjs':'text/javascript', '.png':'image/png', '.svg':'image/svg+xml', '.json':'application/json' };
const server = http.createServer(async (req, res) => {
  const sendJSON=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  try {
    const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if(name==='/api/ranking'||name==='/api/player'||name==='/api/attempt'){
      if(req.method==='GET'&&name==='/api/ranking')return sendJSON(200,{scores:await leaderboard.list()});
      if(req.method==='GET'&&name==='/api/player'){
        const cookie=req.headers.cookie?.split(';').map(c=>c.trim()).find(c=>c.startsWith('snail_player='));
        const [id,token]=(cookie?.slice('snail_player='.length)||'').split('.');
        return sendJSON(200,{identity:id&&token?await leaderboard.resume({id,token}):null});
      }
      if(req.method!=='POST')return sendJSON(405,{error:'Método no permitido.'});
      if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return sendJSON(403,{error:'Origen no permitido.'});
      if(!req.headers['content-type']?.startsWith('application/json'))return sendJSON(415,{error:'Formato no permitido.'});
      let data='';for await(const chunk of req){data+=chunk;if(Buffer.byteLength(data)>2048)return sendJSON(413,{error:'El registro es demasiado grande.'});}
      let input;try{input=JSON.parse(data);}catch{return sendJSON(400,{error:'El registro no es válido.'});}
      try{
        const result=await (name==='/api/player'?leaderboard.reserve(input):name==='/api/attempt'?leaderboard.finish(input):leaderboard.add(input));
        if(name==='/api/player')res.setHeader('Set-Cookie',`snail_player=${result.player.id}.${result.token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000`);
        return sendJSON(201,result);
      }catch(e){if(e.code)throw e;return sendJSON(e.status||400,{error:e.message});}
    }
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end();}
    if(!['/','/index.html','/style.css'].includes(name)&&!/^\/(src|vendor|assets)\//.test(name)){res.writeHead(404);return res.end('No encontrado');}
    const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
    if (!file.startsWith(root) || !(await stat(file)).isFile()) throw Error('Not found');
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-cache' });
    res.end(req.method==='HEAD'?undefined:await readFile(file));
  } catch { res.writeHead(404); res.end('No encontrado'); }
});
server.listen(port, host, () => {
  console.log(`A paso lento: http://localhost:${port}`);
  if(host==='0.0.0.0')for(const entries of Object.values(networkInterfaces()))for(const address of entries||[])if(address.family==='IPv4'&&!address.internal)console.log(`En la ofi: http://${address.address}:${port}`);
});
server.on('error', e => { console.error(e.code === 'EADDRINUSE' ? `El puerto ${port} está ocupado. Abrí http://localhost:${port} o elegí otro PORT.` : e); process.exitCode = 1; });
