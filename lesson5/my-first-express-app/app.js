const express = require('express');
const res = require('express/lib/response');

const app = express();

app.set('view engine', 'pug');

app.get('/', (request, response) => {
  response.render('index');
});

app.get('/account', (request, response) => {
  response.render('account', { money: '$100', recentTransaction: true});
})

app.listen(3000, () => {
  console.log('Listening on port 3000.');
})