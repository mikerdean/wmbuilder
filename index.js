const express = require('express');
const app = express();
const fs = require('fs');
const hbs = require('express-handlebars');

const port = 4555;

app.engine('hbs', hbs({ 
	defaultLayout: '_layout',
	layoutsDir: './content/layout',
	partialsDir: './content/partials',
	extname: '.hbs'
}));

app.set('views', './content/views');
app.set('view engine', 'hbs');

app.get('/', function(request, response) {
	response.render('index', { message: 'ride the walrus' });
});

app.listen(port, function() {
	console.log(`Listening on port ${port}`);
});