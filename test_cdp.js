import http from 'http';

function checkCDP(url) {
  http.get(url, r => {
    let data = '';
    console.log('Status code:', r.statusCode);
    r.on('data', chunk => data += chunk);
    r.on('end', () => {
      console.log('Data received:', data);
    });
  }).on('error', e => {
    console.error('Error connecting to ' + url + ':', e.message);
  });
}

checkCDP('http://127.0.0.1:9222/json/list');
checkCDP('http://localhost:9222/json/list');
