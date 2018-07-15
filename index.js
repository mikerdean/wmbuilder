const express = require('express');
const app = express();
const compression = require('compression');
const path = require('path');

const port = 4555;

app.use(compression());
app.use(express.static('dist'));

app.get('/', function(request, response) {
	return response.render('index');
});

app.listen(port, function() {
	console.log(`Listening on port ${port}`);
});