const path = require('path');
const through = require('through2');
const util = require('gulp-util');
const vinyl = require('vinyl');

module.exports = function(file) {

	let filename;

	if (typeof file === 'string') {
		filename = file;
	} else if (typeof file.path === 'string') {
		filename = path.basename(file.path);
	} else {
		throw new util.PluginError('cardIndexer', 'Missing path in file options');
	}

	let factions = [];
	let latest;
	let mtime;

	let bufferContents = function(file, encoding, callback) {

		if (file.isNull()) {
			return callback();
		}

		if (!mtime || file.stat && file.stat.mtime > mtime) {
			latest = file;
			mtime = file.stat.mtime;
		}

		if (file.isBuffer()) {
			let faction = JSON.parse(Buffer.from(file.contents).toString('utf8'));
			factions.push(faction);
			return callback();
		}
		
		if (file.isStream()) {

			let json = '';

			file.contents.on('data', function(chunk) {
				json += chunk;
			});

			file.contents.on('error', this.emit.bind(this, 'error'));

			file.contents.on('end', function() {
				let faction = JSON.parse(json);
				factions.push(faction);
				callback();
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