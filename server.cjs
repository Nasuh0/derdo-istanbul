const http = require('node:http');
const fs = require('node:fs');
const page = fs.readFileSync(__dirname + '/index.html');
http.createServer((req,res)=>{
res.setHeader('Cache-Control','no-store');
res.setHeader('X-Content-Type-Options','nosniff');
if(req.url==='/api/health'){res.writeHead(200,{'Content-Type':'application/json'});return res.end('{"ok":true}');}
if(req.url!=='/'){res.writeHead(404);return res.end();}
res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'"});res.end(page);
}).listen(Number(process.env.PORT)||3000,'0.0.0.0');
