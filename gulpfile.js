const gulp = require('gulp');
const concat = require('gulp-concat');
const minify = require('gulp-minify');
const cleanCss = require('gulp-clean-css');
const rev = require('gulp-rev');
const del = require('del');
const babel = require('gulp-babel');

gulp.task('clean-js', function() {
  return del([
    'dist/js/*.js'
  ]);
});

gulp.task('clean-css', function() {
  return del([
    'dist/css/*.css'
  ]);
});

gulp.task('pack-js', gulp.series(['clean-js'], function() {
  return gulp.src(['js/idb.js', 'js/dbhelper.js', 'js/main.js'])
    .pipe(babel())
    .pipe(concat('bundle.js'))
    // Minify Here
    .pipe(gulp.dest('dist/js'))
}));

gulp.task('pack-css', gulp.series(['clean-css'], function() {
  return gulp.src(['css/styles.css'])
    .pipe(concat('stylesheet.css'))
    .pipe(cleanCss())
    .pipe(gulp.dest('/dist/css'));
}));

gulp.task('watch', function() {
  gulp.watch('js/**/*.js', gulp.parallel(['pack-js']));
  gulp.watch('css/**/*.css', gulp.parallel(['pack-css']));
});

gulp.task('default', gulp.series(['watch']));