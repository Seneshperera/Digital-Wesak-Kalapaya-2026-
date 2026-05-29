import http from 'http';
import fs from 'fs';

const logFile = 'browser_logs.txt';

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  if (req.method === 'OPTIONS') {
    res.end();
    return;
  }
  
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      console.log(body);
      fs.appendFileSync(logFile, body + '\n');
      res.end('ok');
    });
  } else {
    res.end('ready');
  }
});

server.listen(9999, () => {
  console.log('Log server listening on port 9999');
});
