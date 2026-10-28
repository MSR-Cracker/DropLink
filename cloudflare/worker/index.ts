interface CfD1Result<T> { results?: T[]; success: boolean; meta?: unknown; }
interface CfD1Statement {
  bind(...values: unknown[]): CfD1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<CfD1Result<T>>;
  run(): Promise<unknown>;
}
interface CfD1Database { prepare(query: string): CfD1Statement; batch<T = unknown>(statements: CfD1Statement[]): Promise<T[]>; }
interface CfR2ObjectBody { body: ReadableStream<Uint8Array>; httpEtag?: string; writeHttpMetadata(headers: Headers): void; text(): Promise<string>; }
interface CfR2Bucket {
  put(key: string, value: ReadableStream<Uint8Array> | ArrayBuffer | string, options?: {httpMetadata?: {contentType?: string; contentDisposition?: string}; customMetadata?: Record<string,string>}): Promise<unknown>;
  get(key: string, options?: {range?: {offset: number; length: number}}): Promise<CfR2ObjectBody | null>;
  delete(key: string): Promise<void>;
}
interface CfFetcher { fetch(request: Request): Promise<Response>; }
interface Env {
  DB: CfD1Database;
  FILES: CfR2Bucket;
  ASSETS: CfFetcher;
  MAX_FILE_SIZE_MB?: string;
  TURNSTILE_ENABLED?: string;
  TURNSTILE_SECRET_KEY?: string;
}

type UploadRow = {
  id: string; owner_hash: string; original_name: string; category: string;
  content_type: string; size_bytes: number; object_key: string; created_at: string;
};
const COOKIE = "droplink_guest";
const BLOCKED = new Set(["exe","msi","bat","cmd","com","scr","pif","vbs","vbe","js","jse","ws","wsf","wsc","wsh","ps1","psm1","sh","bash","csh","ksh","dll","sys","drv","bin","apk","ipa","jar","app","dmg","pkg","deb","rpm","hta","cpl","msc","reg","html","htm","xhtml","shtml","svg","php","phtml","asp","aspx","jsp","jspx","cgi","pl","py","rb"]);
const INLINE_TYPES = new Set(["image/avif","image/gif","image/jpeg","image/png","image/webp","application/pdf","audio/aac","audio/flac","audio/mpeg","audio/mp4","audio/ogg","audio/wav","audio/webm","video/mp4","video/ogg","video/webm","video/quicktime","text/plain","application/json","text/csv"]);
const TEXT_EXT = new Set(["txt","json","csv","log","md","xml","yml","yaml","ini","conf"]);
const mimeByExt: Record<string,string> = {jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",gif:"image/gif",webp:"image/webp",avif:"image/avif",pdf:"application/pdf",mp3:"audio/mpeg",m4a:"audio/mp4",aac:"audio/aac",wav:"audio/wav",flac:"audio/flac",ogg:"audio/ogg",mp4:"video/mp4",m4v:"video/mp4",mov:"video/quicktime",webm:"video/webm",txt:"text/plain",log:"text/plain",md:"text/plain",ini:"text/plain",conf:"text/plain",yml:"text/plain",yaml:"text/plain",xml:"text/plain",json:"application/json",csv:"text/csv"};
function json(data: unknown, status=200, headers: HeadersInit={}) { return new Response(JSON.stringify(data), {status, headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff",...headers}}); }
function error(status:number, code:string, message:string) { return json({error:{code,message}},status); }
function cookieValue(request:Request, key:string) { return request.headers.get("Cookie")?.split(";").map(v=>v.trim()).find(v=>v.startsWith(`${key}=`))?.slice(key.length+1) ?? null; }
function randomToken(bytes=32) { const data=new Uint8Array(bytes); crypto.getRandomValues(data); return Array.from(data,b=>b.toString(16).padStart(2,"0")).join(""); }
async function sha256(value:string) { const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)); return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join(""); }
async function owner(request:Request) { let token=cookieValue(request,COOKIE); let setCookie=""; if(!token || !/^[a-f0-9]{64}$/.test(token)){ token=randomToken(); setCookie=`${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`; } return { hash:await sha256(token), setCookie }; }
function cleanName(value:unknown) { if(typeof value!=="string") return ""; const name=value.normalize("NFKC").replace(/[\\/\u0000-\u001f\u007f]/g,"_").replace(/\s+/g," ").trim().slice(0,255); if(!name || name==="." || name==="..") return ""; return name; }
function extOf(name:string) { return name.includes(".") ? name.split(".").pop()!.toLowerCase() : ""; }
function category(type:string,name:string) { const ext=extOf(name); if(type.startsWith("image/"))return"image"; if(type==="application/pdf")return"pdf"; if(type.startsWith("audio/"))return"audio"; if(type.startsWith("video/"))return"video"; if(["zip","rar","7z","tar","gz","bz2"].includes(ext))return"archive"; if(type.startsWith("text/")||type==="application/json"||["doc","docx","odt","rtf","txt","md","csv","json","log","xml","yml","yaml","xls","xlsx","ods","ppt","pptx","odp"].includes(ext))return"document"; return"other"; }
function contentType(raw:unknown,name:string) { const ext=extOf(name); const candidate=typeof raw==="string"?raw.split(";")[0].trim().toLowerCase():""; const valid=/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(candidate); const inferred=mimeByExt[ext]; if(inferred && (TEXT_EXT.has(ext)||!candidate||candidate==="application/octet-stream"))return inferred; if(valid&&INLINE_TYPES.has(candidate))return candidate; return inferred&&INLINE_TYPES.has(inferred)?inferred:"application/octet-stream"; }
function maxBytes(env:Env) { const mb=Number(env.MAX_FILE_SIZE_MB||100); return Number.isFinite(mb)&&mb>=1&&mb<=500?Math.floor(mb*1024*1024):100*1024*1024; }
function publicFile(row:UploadRow) { return {id:row.id,name:row.original_name,category:row.category,contentType:row.content_type,sizeBytes:row.size_bytes,createdAt:row.created_at,url:`/files/${encodeURIComponent(row.id)}/content`,downloadUrl:`/files/${encodeURIComponent(row.id)}/content`,previewUrl:`/preview/${encodeURIComponent(row.id)}`}; }
async function serve(request:Request, env:Env):Promise<Response> {
 const url=new URL(request.url); const path=url.pathname;
 if(request.method==="OPTIONS") return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":url.origin,"Access-Control-Allow-Credentials":"true","Access-Control-Allow-Headers":"Content-Type, X-Upload-Ticket","Access-Control-Allow-Methods":"GET,POST,PUT,DELETE,OPTIONS"}});
 if(path==="/api/uploads/config"&&request.method==="GET") return json({maxFileSizeBytes:maxBytes(env),deletionSupported:true,storageReady:true,databaseReady:true,storageDriver:"r2",blockedExtensions:[...BLOCKED],loginConfigured:false});
 if(path==="/api/uploads/prepare"&&request.method==="POST") {
   let body:any; try{body=await request.json()}catch{return error(400,"INVALID_JSON","Send valid JSON.")}
   const name=cleanName(body?.name); const size=body?.size; if(!name)return error(400,"INVALID_FILENAME","Choose a valid file name."); const ext=extOf(name); if(BLOCKED.has(ext))return error(415,"UNSUPPORTED_FILE_TYPE",`Files of type .${ext} are not allowed.`); if(!Number.isSafeInteger(size)||size<=0)return error(400,"INVALID_SIZE","File size must be greater than zero."); if(size>maxBytes(env))return error(413,"FILE_TOO_LARGE","This file exceeds the current upload limit.");
   const own=await owner(request); const type=contentType(body?.type,name); const id=crypto.randomUUID(); const key=`uploads/${id}`; const now=Date.now();
   await env.DB.prepare("DELETE FROM upload_intents WHERE expires_at < ?").bind(now).run();
   await env.DB.prepare("INSERT INTO upload_intents(id,owner_hash,original_name,category,content_type,size_bytes,object_key,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?,?)").bind(id,own.hash,name,category(type,name),type,size,key,now+10*60*1000,now).run();
   return json({id,ticket:id},200,own.setCookie?{"Set-Cookie":own.setCookie}:{});
 }
 const putMatch=path.match(/^\/api\/uploads\/([\w-]+)\/content$/);
 if(putMatch&&request.method==="PUT") {
   const id=putMatch[1]; const own=await owner(request); const ticket=request.headers.get("X-Upload-Ticket"); if(ticket!==id)return error(401,"UPLOAD_TICKET_INVALID","Upload session is invalid.");
   const intent=await env.DB.prepare("SELECT * FROM upload_intents WHERE id=? AND owner_hash=? AND expires_at>=?").bind(id,own.hash,Date.now()).first<any>(); if(!intent)return error(403,"UPLOAD_OWNER_MISMATCH","Upload session expired or belongs to another browser.");
   const len=Number(request.headers.get("Content-Length")); if(!Number.isSafeInteger(len)||len!==intent.size_bytes)return error(400,"UPLOAD_LENGTH_MISMATCH","Uploaded bytes do not match the selected file size."); if(!request.body)return error(400,"EMPTY_BODY","File body is missing.");
   const existing=await env.DB.prepare("SELECT id FROM uploads WHERE id=?").bind(id).first(); if(existing)return error(409,"UPLOAD_ALREADY_USED","Upload session has already been used.");
   try { await env.FILES.put(intent.object_key,request.body,{httpMetadata:{contentType:intent.content_type,contentDisposition:`inline; filename*=UTF-8''${encodeURIComponent(intent.original_name)}`},customMetadata:{uploadId:id}}); await env.DB.batch([env.DB.prepare("INSERT INTO uploads(id,owner_hash,original_name,category,content_type,size_bytes,object_key) VALUES(?,?,?,?,?,?,?)").bind(id,own.hash,intent.original_name,intent.category,intent.content_type,intent.size_bytes,intent.object_key),env.DB.prepare("DELETE FROM upload_intents WHERE id=?").bind(id)]); const row={id,owner_hash:own.hash,original_name:intent.original_name,category:intent.category,content_type:intent.content_type,size_bytes:intent.size_bytes,object_key:intent.object_key,created_at:new Date().toISOString()} as UploadRow; return json(publicFile(row),201,own.setCookie?{"Set-Cookie":own.setCookie}:{}); }
   catch(e){await env.FILES.delete(intent.object_key).catch(()=>{}); return error(502,"UPLOAD_FAILED","Storage could not confirm this upload. Please retry.");}
 }
 if(path==="/api/uploads"&&request.method==="GET") {
   const own=await owner(request); const search=(url.searchParams.get("search")||"").trim().slice(0,120); const cat=url.searchParams.get("category")||""; const sort=url.searchParams.get("sort")||"newest"; const offset=Math.max(0,Math.min(100000,Number(url.searchParams.get("offset")||0))); const allowed=new Set(["image","pdf","audio","video","document","archive","other"]); const whereCat=allowed.has(cat)?" AND category = ?":""; const order:Record<string,string>={newest:"created_at DESC",oldest:"created_at ASC",largest:"size_bytes DESC",smallest:"size_bytes ASC",name_asc:"original_name COLLATE NOCASE ASC",name_desc:"original_name COLLATE NOCASE DESC"}; const params:any[]=[own.hash];
   let sql=`SELECT * FROM uploads WHERE owner_hash=?${whereCat}`; if(search)sql+=" AND original_name LIKE ? ESCAPE '\\'"; sql+=` ORDER BY ${order[sort]||order.newest} LIMIT 51 OFFSET ?`; if(allowed.has(cat))params.push(cat); if(search)params.push(`%${search.replace(/[\\%_]/g,"\\$&")}%`); params.push(offset);
   const result=await env.DB.prepare(sql).bind(...params).all<UploadRow>(); const rows=result.results||[]; return json({files:rows.slice(0,50).map(publicFile),hasMore:rows.length>50,totalCount:undefined,ownerType:"guest",deletionSupported:true},200,own.setCookie?{"Set-Cookie":own.setCookie}:{});
 }
 const textMatch=path.match(/^\/api\/uploads\/([\w-]+)\/text$/); const itemMatch=path.match(/^\/api\/uploads\/([\w-]+)$/);
 if((textMatch||itemMatch)&&request.method==="GET") { const id=(textMatch||itemMatch)![1]; const row=await env.DB.prepare("SELECT * FROM uploads WHERE id=?").bind(id).first<UploadRow>(); if(!row)return error(404,"FILE_NOT_FOUND","File not found."); if(textMatch){const ext=extOf(row.original_name); if(!(row.content_type==="text/plain"||row.content_type==="application/json"||row.content_type==="text/csv"||TEXT_EXT.has(ext)))return error(415,"PREVIEW_NOT_TEXT","This file is not a supported text document."); const object=await env.FILES.get(row.object_key,{range:{offset:0,length:256*1024}}); if(!object)return error(404,"FILE_NOT_FOUND","File content not found."); const text=await object.text(); return new Response(text,{headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"private, max-age=60","X-Content-Type-Options":"nosniff"}}); } return json({...publicFile(row),downloadUrl:publicFile(row).url}); }
 if(itemMatch&&request.method==="DELETE") { const id=itemMatch[1]; const own=await owner(request); const row=await env.DB.prepare("SELECT * FROM uploads WHERE id=? AND owner_hash=?").bind(id,own.hash).first<UploadRow>(); if(!row)return error(404,"FILE_NOT_FOUND","File not found or you do not own it."); await env.DB.prepare("DELETE FROM uploads WHERE id=? AND owner_hash=?").bind(id,own.hash).run(); await env.FILES.delete(row.object_key); return json({id},200,own.setCookie?{"Set-Cookie":own.setCookie}:{}); }
 const fileMatch=path.match(/^\/files\/([\w-]+)\/content$/); if(fileMatch&&request.method==="GET") { const row=await env.DB.prepare("SELECT * FROM uploads WHERE id=?").bind(fileMatch[1]).first<UploadRow>(); if(!row)return error(404,"FILE_NOT_FOUND","File not found."); const object=await env.FILES.get(row.object_key); if(!object)return error(404,"FILE_CONTENT_MISSING","File content not found."); const headers=new Headers(); object.writeHttpMetadata(headers); headers.set("Content-Type",row.content_type); headers.set("X-Content-Type-Options","nosniff"); headers.set("Cache-Control","public, max-age=3600"); headers.set("Content-Disposition",`inline; filename*=UTF-8''${encodeURIComponent(row.original_name)}`); if(object.httpEtag)headers.set("ETag",object.httpEtag); return new Response(object.body,{headers}); }
 if(path==="/api/health")return json({ok:true,service:"droplink-cloudflare"});
 return env.ASSETS.fetch(request);
}
export default { fetch(request:Request,env:Env) { return serve(request,env).catch((e)=>{console.error("DropLink Worker error",e);return error(500,"INTERNAL_ERROR","Unexpected server error.");}); } };
