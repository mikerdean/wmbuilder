const { src, dest, parallel, watch } = require('gulp');

const autoprefixer = require('gulp-autoprefixer');
const cardIndexer = require('./gulp-cardIndexer')
const concat = require('gulp-concat');
const cleanCss = require('gulp-clean-css');
const imageMin = require('gulp-imagemin');
const rename = require('gulp-rename');
const sass = require('gulp-sass');
const uglifyjs = require('gulp-uglify');

function css() {
	return src(['./src/scss/wmbuilder.scss'])
		.pipe(sass().on('error', sass.logError))
		.pipe(concat('default.css'))
		.pipe(autoprefixer())
		.pipe(cleanCss({
			level: {
				1: {
					specialComments: false
				}
			}
		}))
		.pipe(dest('./dist/css/'));
};

function js() {
	return src([
			'./node_modules/jquery/dist/jquery.js',
			'./node_modules/knockout/build/output/knockout-latest.js',
			'./src/js/index.js'
		])
		.pipe(concat('default.js'))
		.pipe(uglifyjs())
		.pipe(dest('./dist/js'));
};

function cardindex() {
	return src(['./src/cards/**/*.json'])
		.pipe(cardIndexer('./src/cards-amend/__card-index-amendments.json', '__cardindex.json'))
		.pipe(dest('./dist/cards'));
};

function cardimage() {
	return src(['./src/cards/**/*.jpg'])
		.pipe(rename({
			dirname: ''
		}))
		.pipe(imageMin())
		.pipe(dest('./dist/cards'));
};

function watcher() {
	watch('./src/js/**/*.js', {}, js);
	watch('./src/scss/**/*.scss', {}, css);
	watch('./src/cards*/**/*.json', {}, cardindex);
	watch('./src/cards/**/*.jpg', {}, cardimage);
};

exports.default = parallel(css, js, cardindex, cardimage);
exports.cardimage = cardimage;
exports.cardindex = cardindex;
exports.css = css;
exports.js = js;
exports.watch = watcher;
