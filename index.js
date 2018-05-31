const express = require('express');
const app = express();
const hbs = require('express-handlebars');
const body = require('body-parser');
const path = require('path');
const cardIndexer = require('./cardIndexer');

const port = 4555;
const cards = new cardIndexer(path.join(__dirname, '/content/cards'));

app.engine('hbs', hbs({ 
	defaultLayout: '_layout',
	layoutsDir: path.join(__dirname, '/content/layout'),
	partialsDir: path.join(__dirname, '/content/partials'),
	extname: '.hbs'
}));

app.set('views', path.join(__dirname, '/content/views'));
app.set('view engine', 'hbs');

app.use('/css', express.static(path.join(__dirname, '/content/css')));
app.use('/js', express.static(path.join(__dirname, '/content/js')));
app.use(body.json());

app.get('/', function(request, response) {
	return response.render('index');
});

app.post('/api/factions', function(request, response) {
	cards.getFactions(function(err, factions) {
		return err ? response.sendStatus(500) : response.send(factions);
	});
});

app.listen(port, function() {
	console.log(`Listening on port ${port}`);
});