const HTTP = require('http');
const { runInNewContext } = require('vm');
const { resourceLimits } = require('worker_threads');
const URL = require('url').URL;
const HANDLEBARS = require('handlebars');
const { deflateRawSync } = require('zlib');
const FS = require('fs');
const ROUTER = require('router');
const FINALHANDLER = require('finalhandler');
const SERVESTATIC = require('serve-static');
const PATH = require('path');
const APR = 5;
const PORT = 3000;
const MIME_TYPES = {
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.jpg': 'image.jpeg',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
}

const LOAN_OFFER_SOURCE = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Loan Calculator</title>
    <link rel="stylesheet" href="/assets/css/styles.css">
  </head>
  <body>
    <article>
      <h1>Loan Calculator</h1>
      <table>
        <tbody>
          <tr>
            <th>Amount:</th>
            <td><a href="/loan-offer?amount={{amountDecrement}}&years={{years}}">-$100</a></td>
            <td>{{amount}}</td>
            <td><a href="/loan-offer?amount={{amountIncrement}}&years={{years}}">+$100</a></td>
          </tr >
          <tr>
            <th>Duration:</th>
            <td><a href="/loan-offer?amount={{amount}}&years={{yearsDecrement}}">-1 Year</a></td>
            <td>{{years}} years</td>
            <td><a href="/loan-offer?amount={{amount}}&years={{yearsIncrement}}">+1 Year</a></td>
          </tr>
          <tr>
            <th>APR:</th>
            <td colspan='3'>{{APR}}%</td>
          </tr>
          <tr>
            <th>Monthly payment:</th>
            <td colspan='3'>$ {{payment}}</td>
          </tr>
        </tbody > 
      </table >
    </article >
  </body >
</html > `;

const LOAN_FORM_SOURCE = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Loan Calculator</title>
    <link rel="stylesheet" href="/assets/css/styles.css">
  </head>
  <body>
  <article>
    <h1>Loan Calculator</h1>
    <form action="/loan-offer" method="post">
      <p>All loans are offered at an APR of {{apr}}%.</p>
      <label for="amount">How much do you want to borrow (in dollars)?</label>
      <input type="number" name="amount" value="">
      <label for="amount">How much time do you want to pay back your loan?</label>
      <input type="number" name="years" value="">
      <input type="submit" name="" value="Get loan offer!">
    </form>
  </article>
</body>
</html>
`;

const LOAN_OFFER_TEMPLATE = HANDLEBARS.compile(LOAN_OFFER_SOURCE);
const LOAN_FORM_TEMPLATE = HANDLEBARS.compile(LOAN_FORM_SOURCE);

function render(template, data) {
  let html = template(data);
  return html;
}

function parseFormData(request, callback) {
  let body = '';
  request.on('data', chunk => {
    body += chunk.toString();
  });
  request.on('end', () => {
    let data = {};
    let searchParams = new URLSearchParams(body);
    console.log(searchParams.entries());
    for (let [key, value] of searchParams.entries()) {
      data[key] = Number(value)
    }
    callback(data);
  });
}

function getPathname(path) {
  const myURL = new URL(path, `http://localhost:${PORT}`);
  return myURL.pathname;
}

function getLoanOffer(res, path) {

}

function postLoanOffer(req, res) {

}

let router = ROUTER();
router.use(SERVESTATIC('public'));
router.get('/', function (req, res) {
  let content = render(LOAN_FORM_TEMPLATE, { apr: APR });
  res.statusCode = 200;
  res.setHeader('Content-Type', 'Text/html');
  res.write(`${content}\n`);
  res.end();
});

router.get('/loan-offer', function (req,res) {
  let data = getParameters(req.url);
  const LOAN = createLoanOffer(data);
  const content = render(LOAN_OFFER_TEMPLATE, LOAN);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'Text/html');
  res.write(`${content}\n`);
  res.end();
});

router.post('/loan-offer', function (req,res) {
  parseFormData(req, parsedData => {
    let loan = createLoanOffer(parsedData);
    let content = render(LOAN_OFFER_TEMPLATE, loan);
    res.statuscode = 200;
    res.setHeader('Content-Type', 'text/html');
    res.write(`${content}\n`);
    res.end();
  })
});

router.get('*', function (req, res) {
  res.statusCode = 404;
  res.end();
});

const SERVER = HTTP.createServer((req, res) => {
  router(req, res, FINALHANDLER(req, res));
})

function calculateLoan(years, amount, APR) {
  let duration = years * 12;
  let monthlyAPR = APR / 12 / 100;
  return Math.round((amount * (monthlyAPR / (1 - ((1 + monthlyAPR) ** (-duration))))) * 100) / 100;
}

function getParameters(path) {
  let myURL = new URL(path, `http://localhost:${PORT}`);
  let searchParams = myURL.searchParams;
  let data = {};
  data.amount = Number(searchParams.get('amount'));
  data.years = Number(searchParams.get('years'));

  return data;
}

function createLoanOffer(data) {
  data.amountIncrement = data.amount + 100;
  data.amountDecrement = data.amount - 100;
  data.yearsIncrement = data.years + 1;
  data.yearsDecrement = data.years - 1;
  data.APR = APR;
  data.payment = calculateLoan(data.years, data.amount, APR);
  return data;
}


SERVER.listen(PORT);