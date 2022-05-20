const HTTP = require('http');
const PORT = 3000;

const SERVER = HTTP.createServer((req, res) => {

  if (req.url === '/favicon.ico') {
    res.statusCode = 400;
    res.end();
  } else {
    res.statusCode = 200;
    res.setHeader('Content-type', 'text/plain');
    res.write(`${req.method} ${req.url}\n`)
    res.end();
  }

});

SERVER.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
})