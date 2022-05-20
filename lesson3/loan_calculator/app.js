const HTTP = require('http');
const { runInNewContext } = require('vm');
const { resourceLimits } = require('worker_threads');
const PORT = 3000;
const URL = require('url').URL;
const HANDLEBARS = require('handlebars');
const { deflateRawSync } = require('zlib');

const SOURCE = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Loan Calculator</title>
    <style type="text/css">
      body {
        background: rgba(250, 250, 250);
        font-family: sans-serif;
        color: rgb(50, 50, 50);
      }

      article {
        width: 100%;
        max-width: 40rem;
        margin: 0 auto;
        padding: 1rem 2rem;
      }

      h1 {
        font-size: 2.5rem;
        text-align: center;
      }

      table {
        font-size: 1.5rem;
      }

      th {
        text-align: right;
      }

      td {
        text-align: center;
      }

      th, td {
        padding: 0.5rem;
      }
    </style>
  </head>
  <body>
    <article>
      <h1>Loan Calculator</h1>
      <table>
        <tbody>
          <tr>
            <th>Amount:</th>
            <td><a href="/?amount={{amountDecrement}}&years={{years}}">-$100</a></td>
            <td>{{amount}}</td>
            <td><a href="/?amount={{amountIncrement}}&years={{years}}">+$100</a></td>
          </tr >
          <tr>
            <th>Duration:</th>
            <td><a href="/?amount={{amount}}&years={{yearsDecrement}}">-1 Year</a></td>
            <td>{{years}} years</td>
            <td><a href="/?amount={{amount}}&years={{yearsIncrement}}">+1 Year</a></td>
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

const LOAN_OFFER_TEMPLATE = HANDLEBARS.compile(SOURCE);

function render(template, data) {
  let html = LOAN_OFFER_TEMPLATE(data);
  return html;
}

const SERVER = HTTP.createServer((req, res) => {
  let path = req.url;
  console.log(path);

  if (path === "/favicon.ico") {
    res.statusCode = 400;
    res.end();
  } else {
    let parameters = getParameters(req);
    console.log(parameters);
    const LOAN = createLoanOffer(parameters);
    const HTML = render(SOURCE, LOAN);
    res.write(HTML);
    res.end();
  }
})

function calculateLoan(years, amount, APR) {
  let duration = years * 12;
  let monthlyAPR = APR / 12 / 100;
  return Math.round((amount * (monthlyAPR / (1 - ((1 + monthlyAPR) ** (-duration))))) * 100) / 100;
}

function getParameters(req) {
  let path = req.url;
  let host = req.rawHeaders[1];
  let myURL = new URL(path, `http://${host}`);
  return myURL.searchParams;
}

function createLoanOffer(parameters) {
  const APR = 5;
  let data = {};
  data.amount = Number(parameters.get('amount'));
  data.amountIncrement = data.amount + 100;
  data.amountDecrement = data.amount - 100;
  data.years = Number(parameters.get('years'));
  data.yearsIncrement = data.years + 1;
  data.yearsDecrement = data.years - 1;
  data.APR = APR;
  data.payment = calculateLoan(data.years, data.amount, APR);
  return data;
}


SERVER.listen(PORT);