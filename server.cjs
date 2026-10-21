// Optional dependency-free local preview. The game also runs directly from its HTML file.
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=__dirname;
http.createServer((req,res)=>{let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}catch{res.writeHead(400).end();return;}if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}if(file===root)file=path.join(root,'index.html');fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end('Not found');return;}res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript'})[path.extname(file)]||'application/octet-stream');res.end(data);});}).listen(Number(process.env.PORT)||5173,'127.0.0.1',()=>console.log('Bean Duty: http://127.0.0.1:'+(Number(process.env.PORT)||5173)));

