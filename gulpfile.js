'use strict';

// gulp watch で開く html
var html_dir = "public";
var html = "index.html";

var watch      = require('gulp-watch');
var gulp       = require('gulp');
var browserSync= require('browser-sync').create();

gulp.task('reload', function () {
	return browserSync.reload();
});

gulp.task('browser-sync', function() {
	return browserSync.init({
		server: {
			baseDir: html_dir,
			index: html,
		}
	});
});

gulp.task('watch', ['browser-sync'], function() {
	gulp.watch('public/js/**/*.js', ['reload']);
});

