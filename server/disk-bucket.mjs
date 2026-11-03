import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';

export function createDiskBucket(directory) {
  const root=resolve(directory);
  function filename(key) {
    if(typeof key!=='string'||!key||!/^[A-Za-z0-9/_-]+$/.test(key))throw new Error('Invalid upload key');
    const path=resolve(root,key),local=relative(root,path);
    if(local==='..'||local.startsWith('..'+sep)||!local)throw new Error('Invalid upload path');
    return path;
  }
  return {
    async put(key,body,options={}) {
      const file=filename(key);await mkdir(dirname(file),{recursive:true});
      const bytes=body instanceof ArrayBuffer?new Uint8Array(body):body;
      const temp=file+'.'+randomUUID()+'.tmp';
      await writeFile(temp,bytes);await rename(temp,file);
      await writeFile(file+'.json',JSON.stringify(options.httpMetadata||{}));
      return {key,size:bytes.byteLength};
    },
    async get(key) {
      const file=filename(key);
      try {const [body,metadata]=await Promise.all([readFile(file),readFile(file+'.json','utf8')]);return {body,size:body.length,httpMetadata:JSON.parse(metadata),writeHttpMetadata(headers){for(const [key,value]of Object.entries(this.httpMetadata))if(key==='contentType')headers.set('Content-Type',value);}};}
      catch(error){if(error.code==='ENOENT')return null;throw error;}
    },
    async delete(key) {const file=filename(key);await Promise.all([file,file+'.json'].map(path=>unlink(path).catch(error=>{if(error.code!=='ENOENT')throw error;})));},
  };
}
