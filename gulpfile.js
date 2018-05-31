const gulp = require('gulp');

const autoprefixer = require('gulp-autoprefixer');
const concat = require('gulp-concat');
const cleanCss = require('gulp-clean-css');
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
		.pipe(gulp.dest('./content/css/'));
});

gulp.task('js-app', function() {
	return gulp.src(['./src/js/*.js'])
		.pipe(uglifyjs())
		.pipe(gulp.dest('./content/js'));
});

gulp.task('js-lib', function() {
	return gulp.src([
			'./node_modules/jquery/dist/jquery.js',
			'./node_modules/knockout/build/output/knockout-latest.js',
		])
		.pipe(concat('default.js'))
		.pipe(uglifyjs())
		.pipe(gulp.dest('./content/js'));
});

gulp.task('js', ['js-lib', 'js-app']);

gulp.task('default', ['css', 'js']);