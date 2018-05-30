const gulp = require('gulp');

const autoprefixer = require('gulp-autoprefixer');
const concat = require('gulp-concat');
const cleanCss = require('gulp-clean-css');
const sass = require('gulp-sass');

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

gulp.task('js', function() {
});

gulp.task('default', ['css', 'js']);