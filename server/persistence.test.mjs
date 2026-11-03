import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join,resolve,dirname,basename } from 'node:path';
import { startServer } from './main.mjs';

test('real HTTP: two clients share rooms and photos across a SQLite restart',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'spider-link-persistence-'));
  let app;
  try{
    app=await startServer({port:0,host:'127.0.0.1',dataDirectory:directory});
    async function request(path,body,token){const response=await fetch(app.url+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,...await response.json()};}
    const owner=await request('/api/rooms',{name:'Персистентный штаб',member:{name:'Паук A',heroId:'miles',earth:'1610',power:'Паутина',motto:'Вместе'}});
    assert.equal(owner.status,201);const {roomId,token}=owner.membership;
    const second=await request('/api/rooms/join',{code:owner.room.inviteCode,member:{name:'Паук Б',heroId:'gwen',earth:'65'}});
    assert.equal(second.status,201);assert.notEqual(second.membership.token,token);
    const rally=await request('/api/rooms/'+roomId+'/actions',{type:'rally.create',title:'Киновечер',description:'Собираемся',when:new Date(Date.now()+86400000).toISOString()},token);
    assert.equal(rally.status,200);const rallyId=rally.room.rallies[0].id;
    await Promise.all([
      request('/api/rooms/'+roomId+'/actions',{type:'rally.respond',rallyId,response:'in'},token),
      request('/api/rooms/'+roomId+'/actions',{type:'rally.respond',rallyId,response:'later'},second.membership.token),
    ]);
    const shared=await request('/api/rooms/'+roomId,null,second.membership.token);
    assert.equal(shared.room.members.length,2);assert.equal(Object.keys(shared.room.rallies[0].responses).length,2);
    assert.equal((await request('/api/rooms/'+roomId)).status,401);
    assert(!JSON.stringify(shared.room).includes(token));
    const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6pBckAAAAASUVORK5CYII=','base64');
    const upload=await fetch(app.url+'/api/rooms/'+roomId+'/photos',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'image/png'},body:png});
    assert.equal(upload.status,201);const photo=(await upload.json()).photo;
    const denied=await fetch(app.url+'/api/rooms/'+roomId+'/photos/'+photo.id);assert.equal(denied.status,401);
    const tooLarge=await fetch(app.url+'/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:'x'.repeat(33000)});assert.equal(tooLarge.status,413);
    const foreign=await fetch(app.url+'/api/rooms',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://another.example'},body:'{}'});assert.equal(foreign.status,403);
    const page=await fetch(app.url+'/');assert.equal(page.status,200);assert((await page.text()).includes('SPIDER'));
    const secret=await fetch(app.url+'/.env');assert.equal(secret.status,403);
    await app.close();app=null;
    app=await startServer({port:0,host:'127.0.0.1',dataDirectory:directory});
    const after=await request('/api/rooms/'+roomId,null,second.membership.token);
    assert.equal(after.status,200);assert.equal(after.room.members.length,2);assert.equal(Object.keys(after.room.rallies[0].responses).length,2);
    const savedPhoto=await fetch(app.url+'/api/rooms/'+roomId+'/photos/'+photo.id,{headers:{Authorization:'Bearer '+second.membership.token}});
    assert.equal(savedPhoto.status,200);assert.deepEqual(Buffer.from(await savedPhoto.arrayBuffer()),png);
  }finally{if(app)await app.close();assert.equal(dirname(resolve(directory)),resolve(tmpdir()));assert(basename(directory).startsWith('spider-link-persistence-'));await rm(directory,{recursive:true,force:true});}
});
