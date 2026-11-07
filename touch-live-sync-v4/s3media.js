'use strict';
// Dependency-free AWS Signature V4 adapter for S3-compatible storage (Cloudflare R2 etc).
// Multipart parts upload directly from the browser; credentials stay on this server.
const crypto=require('node:crypto');
const endpoint=String(process.env.S3_ENDPOINT||'').trim().replace(/\/+$/,'');
const bucket=String(process.env.S3_BUCKET||'').trim();
const region=String(process.env.S3_REGION||'auto').trim();
const accessKey=process.env.S3_ACCESS_KEY_ID||'';
const secretKey=process.env.S3_SECRET_ACCESS_KEY||'';
const prefix=String(process.env.S3_PREFIX||'touch-live').replace(/^\/+|\/+$/g,'');
const enabled=!!(endpoint&&bucket&&accessKey&&secretKey);
const VIDEO=prefix+'/master-video.mp4',CAPTIONS=prefix+'/captions.vtt',MANIFEST=prefix+'/manifest.json';
function check(){if(!enabled)throw Error('S3/R2-Cloud-Speicher ist noch nicht konfiguriert.');}
const enc=x=>encodeURIComponent(x).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
const h=(k,s)=>crypto.createHmac('sha256',k).update(s).digest();
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const utc=()=>new Date().toISOString().replace(/[-:]|\.\d{3}/g,'');
function signatureKey(day){let k=h('AWS4'+secretKey,day);k=h(k,region);k=h(k,'s3');return h(k,'aws4_request');}
function resource(key){check();const u=new URL(endpoint);const base=u.pathname.replace(/\/+$/,'');return {origin:u.origin,host:u.host,uri:(base||'')+'/'+enc(bucket)+'/'+key.split('/').map(enc).join('/')};}
function sorted(query){return Object.entries(query||{}).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>enc(k)+'='+enc(String(v??''))).join('&');}
function canonical(method,uri,query,headers,signed,payload){return [method,uri,sorted(query),headers,signed,payload].join('\n');}
function sign(method,key,query={},body='',moreHeaders={}){
 const b=Buffer.isBuffer(body)?body:Buffer.from(body),date=utc(),day=date.slice(0,8),r=resource(key);
 const payload=hash(b),headers={'host':r.host,'x-amz-content-sha256':payload,'x-amz-date':date};
 const keys=Object.keys(headers).sort(), signed=keys.join(';');
 const canonicalHeaders=keys.map(k=>k+':'+headers[k].trim()+'\n').join('');
 const scope=[day,region,'s3','aws4_request'].join('/');
 const request=canonical(method,r.uri,query,canonicalHeaders,signed,payload);
 const stringToSign=['AWS4-HMAC-SHA256',date,scope,hash(request)].join('\n');
 const signature=h(signatureKey(day),stringToSign).toString('hex');
 const authorization='AWS4-HMAC-SHA256 Credential='+accessKey+'/'+scope+', SignedHeaders='+signed+', Signature='+signature;
 return {url:r.origin+r.uri+(Object.keys(query).length?'?'+sorted(query):''),headers:{'x-amz-date':date,'x-amz-content-sha256':payload,authorization,...moreHeaders},body:b};
}
function presign(method,key,query={},expires=1800){
 const r=resource(key),date=utc(),day=date.slice(0,8),scope=[day,region,'s3','aws4_request'].join('/');
 const fields={...query,'X-Amz-Algorithm':'AWS4-HMAC-SHA256','X-Amz-Credential':accessKey+'/'+scope,'X-Amz-Date':date,'X-Amz-Expires':String(expires),'X-Amz-SignedHeaders':'host','X-Amz-Content-Sha256':'UNSIGNED-PAYLOAD'};
 const canonicalHeaders='host:'+r.host+'\n';
 const request=canonical(method,r.uri,fields,canonicalHeaders,'host','UNSIGNED-PAYLOAD');
 const signature=h(signatureKey(day),['AWS4-HMAC-SHA256',date,scope,hash(request)].join('\n')).toString('hex');
 return r.origin+r.uri+'?'+sorted({...fields,'X-Amz-Signature':signature});
}
async function request(method,key,query={},body='',extraHeaders={}){
 const x=sign(method,key,query,body,extraHeaders);
 const response=await fetch(x.url,{method,headers:x.headers,body:method==='GET'||method==='HEAD'?undefined:x.body,redirect:'error',signal:AbortSignal.timeout(35000)});
 const content=await response.text();
 if(!response.ok){const err=new Error('Cloud-Speicher ('+response.status+'): '+content.replace(/<[^>]+>/g,' ').slice(0,190));err.status=response.status;throw err;}
 return {response,text:content};
}
const xmlEscape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const xmlTag=(txt,name)=>{const x=txt.match(new RegExp('<(?:\\w+:)?'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?'+name+'>','i'));return x?x[1]:null;};
async function initiate(){
 const x=await request('POST',VIDEO,{uploads:''},'',{'content-type':'video/mp4'});
 const uploadId=xmlTag(x.text,'UploadId');
 if(!uploadId)throw Error('Cloud-Speicher hat keine Upload-ID geliefert.');return uploadId;
}
function partUrl(uploadId,number){if(!/^[a-zA-Z0-9_\-=+.~%/]{6,2048}$/.test(String(uploadId)))throw Error('Upload-ID ungueltig');if(!Number.isInteger(number)||number<1||number>10000)throw Error('Blocknummer ungueltig');return presign('PUT',VIDEO,{partNumber:String(number),uploadId},3600);}
async function list(uploadId){
 const x=await request('GET',VIDEO,{uploadId});
 const matches=[...x.text.matchAll(/<(?:\w+:)?Part>([\s\S]*?)<\/(?:\w+:)?Part>/g)];
 return matches.map(v=>({number:Number(xmlTag(v[1],'PartNumber')),etag:xmlTag(v[1],'ETag'),size:Number(xmlTag(v[1],'Size'))})).filter(x=>Number.isInteger(x.number)&&x.etag);
}
async function complete(uploadId,parts){
 if(!Array.isArray(parts)||parts.length<1||parts.length>10000)throw Error('Unvollstaendige Blockliste');
 const unique=new Set();
 const entries=[...parts].sort((a,b)=>a.number-b.number).map(p=>{
 if(!Number.isInteger(p.number)||p.number<1||p.number>10000||!/^"?[a-f0-9]{32}"?$/i.test(p.etag)||unique.has(p.number))throw Error('Ungueltiger Video-Block');
 unique.add(p.number);return '<Part><PartNumber>'+p.number+'</PartNumber><ETag>'+xmlEscape(p.etag.startsWith('"')?p.etag:'"'+p.etag+'"')+'</ETag></Part>';
 });
 const body='<?xml version="1.0" encoding="UTF-8"?><CompleteMultipartUpload>'+entries.join('')+'</CompleteMultipartUpload>';
 const x=await request('POST',VIDEO,{uploadId},body,{'content-type':'application/xml'});
 if(/<Error>/.test(x.text))throw Error('S3 konnte den Video-Upload nicht abschliessen: '+x.text.slice(0,200));
 return true;
}
async function put(key,content,contentType='application/octet-stream'){
 const b=Buffer.isBuffer(content)?content:Buffer.from(content);
 return request('PUT',key,{},b,{'content-type':contentType});
}
async function readText(key){return (await request('GET',key)).text;}
async function manifest(){try{return JSON.parse(await readText(MANIFEST));}catch(e){if(e.status===404)return null;throw e;}}
async function putManifest(value){await put(MANIFEST,JSON.stringify(value),'application/json');}
function videoUrl(){return presign('GET',VIDEO,{},14400);} // 4h: 52min film + pauses + seeks
async function captionText(){try{return await readText(CAPTIONS);}catch(e){if(e.status===404)return null;throw e;}}
module.exports={enabled,VIDEO,CAPTIONS,MANIFEST,initiate,partUrl,list,complete,put,readText,manifest,putManifest,videoUrl,captionText};
