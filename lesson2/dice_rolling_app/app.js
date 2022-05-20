const HTTP = require('http');
const PORT = 3000;
const URL = require('url').URL;

const SERVER = HTTP.createServer((req, res) => {

  if (req.url === '/favicon.ico') {
    res.statusCode = 400;
    res.end();
  } else {

    let method = req.method;
    let path = req.url;
    let host = req.rawHeaders[1];
    console.log(path);
    console.log(host);
    const myURL = new URL(path, `http://${host}`);
    let params = myURL.searchParams;
    let quantity = params.get('rolls');
    let max = params.get('sides');
    console.log(myURL);

    if (max > 0 && quantity > 0) {
      let dieValues = dieRoll(quantity, 1, max);
      dieValues.forEach(value => res.write(`${value}\n`));
      res.write(`${method} ${path}`)
      res.statusCode = 200;
      res.end()
    } else {
      res.statusCode = 400;
      res.end();
    }
  }
});

SERVER.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
})

function dieRoll(quantity, min, max) {
  let result = [];
  while (quantity > 0) {
    result.push(Math.floor((Math.random() * max)) + min)
    quantity--
  }
  return result;
}