const fs = require('fs');
const path = require('path');
const through = require('through2');
const {vinyl} = require('gulp');

module.exports = function(amendmentsPath, file) {

	let filename;

	if (typeof amendmentsPath !== 'string') {
		throw new Error('cardIndexer', 'Missing amendments path in file options');
	}

	if (typeof file === 'string') {
		filename = file;
	} else if (typeof file.path === 'string') {
		filename = path.basename(file.path);
	} else {
		throw new Error('cardIndexer', 'Missing path in file options');
	}

	let amendmentsData;
	let factions = [];
	let latest;
	let mtime;

	const arrNames = ['warlocks', 'warcasters', 'warbeasts', 'warjacks', 'units', 'solos'];

	const _addAmendments = function(directoryName, faction) {

		if (!amendmentsData) {
			return;
		}

		if (!amendmentsData.hasOwnProperty(directoryName)) {
			return;
		}

		var amends = amendmentsData[directoryName];

		arrNames.forEach((name) => {
		
			if (faction.hasOwnProperty(name)) {

				faction[name].forEach((unit) => {

					if (amends.hasOwnProperty(unit.id)) {
						var props = amends[unit.id.toString()];
						for(var key in props) {
							unit[key] = props[key];
						}
					}

				});

			}
			
		});

	};

	const _bufferContents = function(file, encoding, callback) {

		if (file.isNull()) {
			return callback();
		}

		if (!mtime || file.stat && file.stat.mtime > mtime) {
			latest = file;
			mtime = file.stat.mtime;
		}

		if (file.isBuffer()) {

			let faction;

			try {
				faction = JSON.parse(Buffer.from(file.contents).toString('utf8'));
			} catch(e) {
				throw new Error('cardIndexer', `Error parsing faction file: ${file.path}.`);
			}

			_addAmendments(path.dirname(file.relative), faction);
			factions.push(faction);

			return callback();
		}
		
		if (file.isStream()) {

			let json = '';

			file.contents.on('data', (chunk) => {
				json += chunk;
			});

			file.contents.on('error', this.emit.bind(this, 'error'));

			file.contents.on('end', () => {
				let faction = JSON.parse(json);
				factions.push(faction);
				callback();
			});
			
		}
	};

	let bufferContents = function(file, encoding, callback) {

		if (amendmentsData) {

			_bufferContents(file, encoding, callback);

		} else {

			fs.readFile(path.resolve(amendmentsPath), 'utf8', (err, json) => {

				if (err) {
					return callback(err);
				}
				
				try {
					amendmentsData = JSON.parse(json);
				} catch(e) {
					throw new Error('cardIndexer', `Error parsing faction file: ${amendmentsPath}.`);
				}

				_bufferContents(file, encoding, callback);

			});

		}
		
	};

	let endStream = function(callback) {
		
		let joined;
		
		if (typeof(file) === 'string') {
			joined = latest.clone({ contents: false });
			joined.path = path.join(latest.base, file);
		} else {
			joined = new vinyl(file);
		}

		joined.contents = Buffer.from(JSON.stringify(factions));
		this.push(joined);

		return callback();
	};

	return through.obj(bufferContents, endStream);

};