const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.jpg':'image/jpeg','.json':'application/json; charset=utf-8'};
http.createServer((req,res)=>{
res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'");
let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);return res.end()}
if(pathname==='/api/health'){res.writeHead(200,{'Content-Type':'application/json'});return res.end('{"ok":true}')}
const allowed=['/','/index.html','/app.js','/data.js','/style.css'];
if(!allowed.includes(pathname)&&!/^\/assets\/[a-z-]+\.jpg$/.test(pathname)){res.writeHead(404);return res.end()}
const file=path.join(__dirname,pathname==='/'?'index.html':pathname.slice(1));
fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end()}res.setHeader('Cache-Control',pathname.startsWith('/assets/')?'public, max-age=86400':'no-cache');res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(req.method==='HEAD'?undefined:data)})
}).listen(Number(process.env.PORT)||3000,'0.0.0.0');
