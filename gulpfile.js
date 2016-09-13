'use strict';

const gulp = require('gulp');
const eslint = require('gulp-eslint');

gulp.task('lint', () =>
{
	let src = [ 'gulpfile.js', 'index.js', 'lib/**/*.js' ];

	return gulp.src(src)
		.pipe(eslint(
			{
				plugins : [ ],
				extends : [ 'eslint:recommended' ],
				settings : {},
				parserOptions :
				{
					sourceType   : 'module',
					ecmaFeatures :
					{
						ecmaVersion   : 6,
						impliedStrict : true,
						jsx           : false
					}
				},
				envs :
				[
					'es6',
					'node',
					'commonjs'
				],
				rules :
				{
					'no-console'     : 0,
					'no-undef'       : 2,
					'no-empty'       : 0,
					'no-unused-vars' : [ 2, { vars: 'all', args: 'after-used' }],
					'quotes'         : [ 2, 'single', { avoidEscape: true } ],
					'semi'           : [ 2, 'always' ]
				}
			}))
		.pipe(eslint.format());
});

gulp.task('default', gulp.series('lint'));
