const gulp = require('gulp');

const autoprefixer = require('gulp-autoprefixer');
const cardIndexer = require('./gulp-cardIndexer')
const concat = require('gulp-concat');
const cleanCss = require('gulp-clean-css');
const imageMin = require('gulp-imagemin');
const rename = require('gulp-rename');
const sass = require('gulp-sass');
const uglifyjs = require('gulp-uglifyjs');

gulp.task('css', function() {
	return gulp.src(['./src/scss/wmbuilder.scss'])
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
		.pipe(gulp.dest('./dist/css/'));
});

gulp.task('js', function() {
	return gulp.src([
			'./node_modules/jquery/dist/jquery.js',
			'./node_modules/knockout/build/output/knockout-latest.js',
			'./src/js/index.js'
		])
		.pipe(concat('default.js'))
		.pipe(uglifyjs())
		.pipe(gulp.dest('./dist/js'));
});

gulp.task('cardindex', function() {
	return gulp.src(['./src/cards/**/*.json'])
		.pipe(cardIndexer('./src/cards-amend/__card-index-amendments.json', '__cardindex.json'))
		.pipe(gulp.dest('./dist/cards'));
});

gulp.task('cardimage', function() {
	return gulp.src(['./src/cards/**/*.jpg'])
		.pipe(rename({
			dirname: ''
		}))
		.pipe(imageMin())
		.pipe(gulp.dest('./dist/cards'));
});

gulp.task('default', ['css', 'js', 'cardindex', 'cardimage']);

// watch tasks

gulp.task('watch', function() {
	gulp.watch('./src/js/**/*.js', ['js']);
	gulp.watch('./src/scss/**/*.scss', ['css']);
	gulp.watch('./src/cards*/**/*.json', ['cardindex']);
	gulp.watch('./src/cards/**/*.jpg', ['cardimage']);
});
