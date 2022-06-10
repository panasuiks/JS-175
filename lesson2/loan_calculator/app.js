const HTTP = require('http');
const { runInNewContext } = require('vm');
const { resourceLimits } = require('worker_threads');
const PORT = 3000;
const URL = require('url').URL;
const HANDLEBARS = require('handlebars');
const { deflateRawSync } = require('zlib');

console.log('test');

const LOAN_OFFER_SOURCE = `
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

const LOAN_FORM_SOURCE = `<!DOCTYPE html>
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

      form,
      input {
        font-size: 1.5rem;
      }
      form p {
        text-align: center;
      }
      label,
      input {
        display: block;
        width: 100%;
        padding: 0.5rem;
        margin-top: 0.5rem;
      }
      input[type="submit"] {
        width: auto;
        margin: 1rem auto;
        cursor: pointer;
        color: #fff;
        background-color: #01d28e;
        border: none;
        border-radius: 0.3rem;
      }
    </style>
  </head>
  <body>
    <article>
      <h1>Loan Calculator</h1>
      <form action="/loan-offer" method="get">
        <p>All loans are offered at an APR of {{apr}}%.</p>
        <label for="amount">How much do you want to borrow (in dollars)?</label>
        <input type="number" name="amount" value="">
        <label for="amount">How much time do you want to pay back your loan?</label>
        <input type="number" name="duration" value="">
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

function getPathname(path) {
  const myURL = new URL(path, `http://localhost:${PORT}`);
  return myURL.pathname;
}

const SERVER = HTTP.createServer((req, res) => {
  let path = req.url;
  let pathname = getPathname(path);
  if (pathname === "/") {
    let content = render(LOAN_FORM_TEMPLATE, {apr: APR});
    res.statusCode = 200;
    res.write(`${content}\n`);
    res.end();
  } else if (pathname === '/loan-offer') {
    let parameters = getParameters(req);
    const LOAN = createLoanOffer(parameters);
    const content = render(LOAN_OFFER_TEMPLATE, LOAN);
    res.write(`${content}\n`);
    res.end();
  } else {
    res.statusCode = 400;
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