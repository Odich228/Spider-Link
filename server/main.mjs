import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { extname,relative,resolve,sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from './sqlite.mjs';
import { createD1Store } from './d1-store.mjs';
import { createDiskBucket } from './disk-bucket.mjs';
import { createRoomsHandler } from './rooms.mjs';

const projectRoot=fileURLToPath(new URL('../',import.meta.url));
const staticRoot=resolve(projectRoot,'dist');
export async function startServer(options={}) {
  const host=options.host??process.env.HOST??'127.0.0.1';
  const port=options.port??Number(process.env.PORT||3000);
  if(!Number.isInteger(port)||port<0||port>65535)throw new Error('Invalid server port');
  const dataDirectory=resolve(options.dataDirectory??process.env.SPIDER_LINK_DATA_DIR??resolve(projectRoot,'.spider-link'));
  const publicUrl=options.publicUrl??process.env.PUBLIC_URL;
  const db=await openDatabase(dataDirectory);
  const handler=createRoomsHandler({store:createD1Store(db),bucket:createDiskBucket(resolve(dataDirectory,'uploads'))});
  const rateWindows=new Map();
  const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json; charset=utf-8'};
  const server=createServer(async(incoming,outgoing)=>{
    outgoing.setHeader('X-Content-Type-Options','nosniff');outgoing.setHeader('Referrer-Policy','no-referrer');
    try {
      const origin=publicUrl?new URL(publicUrl).origin:'http://'+(incoming.headers.host||'localhost');
      const url=new URL(incoming.url,origin);
      if(url.pathname.startsWith('/api/')){
        outgoing.setHeader('Cache-Control','no-store');
        if(!['GET','HEAD'].includes(incoming.method)&&incoming.headers.origin&&incoming.headers.origin!==origin){outgoing.writeHead(403,{'Content-Type':'application/json'}).end(JSON.stringify({error:'Запрос пришёл с другого сайта'}));return;}
        const hasBody=!['GET','HEAD'].includes(incoming.method);
        let body;
        if(hasBody){
          const category=url.pathname==='/api/rooms'||url.pathname==='/api/rooms/join'?'entry':url.pathname.endsWith('/photos')?'photo':'action';
          const key=(incoming.socket.remoteAddress||'unknown')+':'+category,now=Date.now(),limit=category==='entry'?20:category==='photo'?30:180;
          if(rateWindows.size>2000)for(const [key,window]of rateWindows)if(window.until<now)rateWindows.delete(key);
          let window=rateWindows.get(key);if(!window||window.until<now){window={count:0,until:now+60000};rateWindows.set(key,window);}
          if(++window.count>limit){incoming.resume();outgoing.writeHead(429,{'Content-Type':'application/json','Retry-After':'60'}).end(JSON.stringify({error:'Слишком много запросов. Подожди минуту.'}));return;}
          const maximum=category==='photo'?400*1024:32*1024;
          if(Number(incoming.headers['content-length'])>maximum){incoming.resume();outgoing.writeHead(413,{'Content-Type':'application/json'}).end(JSON.stringify({error:'Файл или запрос слишком большой'}));return;}
          const chunks=[];let length=0;
          for await(const chunk of incoming.iterator({destroyOnReturn:false})){
            length+=chunk.length;
            if(length>maximum){incoming.resume();outgoing.writeHead(413,{'Content-Type':'application/json'}).end(JSON.stringify({error:'Файл или запрос слишком большой'}));return;}
            chunks.push(chunk);
          }
          body=Buffer.concat(chunks);
        }
        const request=new Request(url,{method:incoming.method,headers:incoming.headers,...(hasBody?{body}:{})});
        const response=await handler(request);
        outgoing.writeHead(response.status,Object.fromEntries(response.headers));
        if(incoming.method==='HEAD'||!response.body){outgoing.end();return;}
        Readable.fromWeb(response.body).on('error',()=>outgoing.destroy()).pipe(outgoing);return;
      }
      if(!['GET','HEAD'].includes(incoming.method)){outgoing.writeHead(405,{Allow:'GET, HEAD'}).end();return;}
      const pathname=decodeURIComponent(url.pathname);
      if(pathname.includes('\0')||pathname.includes('\\')){outgoing.writeHead(400).end();return;}
      const path=resolve(staticRoot,'.'+(pathname==='/'?'/index.html':pathname));
      const local=relative(staticRoot,path);
      if(local==='..'||local.startsWith('..'+sep)||local.split(/[\\/]/).some(part=>part.startsWith('.'))){outgoing.writeHead(403).end();return;}
      const body=await readFile(path);
      outgoing.writeHead(200,{'Content-Type':types[extname(path).toLowerCase()]||'application/octet-stream','Content-Length':body.length,'Cache-Control':pathname.startsWith('/assets/')?'public, max-age=86400':'no-cache'});
      outgoing.end(incoming.method==='HEAD'?undefined:body);
    }catch(error){
      const status=error.code==='ENOENT'||error.code==='EISDIR'?404:error instanceof URIError?400:500;
      if(!outgoing.headersSent)outgoing.writeHead(status,{'Content-Type':'application/json; charset=utf-8'}).end(JSON.stringify({error:status===404?'Не найдено':'Не удалось обработать запрос'}));else outgoing.destroy();
      if(status===500)console.error('Request failed:',error.message);
    }
  });
  server.requestTimeout=30000;server.headersTimeout=15000;server.keepAliveTimeout=5000;
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,resolve);});
  return {server,db,dataDirectory,url:'http://'+(host.includes(':')?'['+host+']':host)+':'+server.address().port,async close(){server.closeIdleConnections();await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));db.close();}};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const instance=await startServer();console.log('SPIDER-LINK: '+instance.url);console.log('Данные комнат: '+instance.dataDirectory);
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>instance.close().then(()=>process.exit(0)));
}
