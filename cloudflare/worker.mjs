import{createCloudLeaderboard}from'./leaderboard.mjs';
const json=(status,value,headers={})=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}});
async function payload(request){
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw Object.assign(Error('Formato no permitido.'),{status:415});
  const reader=request.body?.getReader();if(!reader)throw Object.assign(Error('El registro no es válido.'),{status:400});
  let size=0,chunks=[];for(;;){const{done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2048){await reader.cancel();throw Object.assign(Error('El registro es demasiado grande.'),{status:413});}chunks.push(value);}
  const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}
  try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw Object.assign(Error('El registro no es válido.'),{status:400});}
}
export default{
  async fetch(request,env){
    const url=new URL(request.url);
    if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
    if(!['/api/player','/api/ranking','/api/attempt'].includes(url.pathname))return json(404,{error:'No encontrado.'});
    if(!env.DB)return json(503,{error:'El ranking todavía no está configurado.'});
    try{
      const board=createCloudLeaderboard(env.DB),path=url.pathname;
      if(request.method==='GET'&&path==='/api/ranking')return json(200,{scores:await board.list()});
      if(request.method==='GET'&&path==='/api/player'){
        const cookie=request.headers.get('cookie')?.split(';').map(c=>c.trim()).find(c=>c.startsWith('snail_player='));const[id,token]=(cookie?.slice(13)||'').split('.');
        return json(200,{identity:id&&token?await board.resume({id,token}):null});
      }
      if(request.method!=='POST')return json(405,{error:'Método no permitido.'},{Allow:'GET, POST'});
      const origin=request.headers.get('origin');if(origin&&origin!==url.origin)return json(403,{error:'Origen no permitido.'});
      const input=await payload(request),result=await(path==='/api/player'?board.reserve(input):path==='/api/attempt'?board.finish(input):board.add(input));
      const headers=path==='/api/player'?{'Set-Cookie':`snail_player=${result.player.id}.${result.token}; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000`}:{};
      return json(201,result,headers);
    }catch(error){if(error.status)return json(error.status,{error:error.message});console.error('No se pudo completar la operación del ranking.');return json(503,{error:'El ranking no está disponible. Reintentá en unos segundos.'});}
  }
};
