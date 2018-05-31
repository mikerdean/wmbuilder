const async = require('async');
const fs = require('fs');
const path = require('path');

module.exports = function(cardDirectory) {
	var self = this;

	const directory = cardDirectory;
	var factions = [];

	// ##### private methods
	var factionSort = function(a, b) {
		return a.factionName === b.factionName ? 0 : (a.factionName < b.factionName ? -1 : 1);
	};

	var factionList = function(callback) {

		fs.readdir(directory, function(err, files) {

			if (err) {
				return callback(err);
			}

			async.each(files, function(file, asyncCallback) {

				var factionPath = path.join(directory, file);

				fs.stat(factionPath, function(err, stat) {

					if (err) {
						return asyncCallback(err);
					}

					if (!stat.isDirectory) {
						return; // continue;
					}

					fs.readFile(path.join(factionPath, '__cardindex.json'), { encoding: 'utf8' }, function(err, cardIndex) {

						if (err) {
							return asyncCallback(err);
						}

						try {
							factions.push(JSON.parse(cardIndex));
							asyncCallback();
						} catch(e) {
							return asyncCallback(e);
						}

					});

				});

			}, function(err) {
				factions.sort(factionSort);
				callback(err, factions);
			});

		});

	};

	// ##### public methods
	self.getFactions = function(callback) {

		if (factions.length > 0) {
			return callback(null, factions);
		}

		factionList(callback);
	};

};