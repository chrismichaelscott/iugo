module.exports = function(grunt) {
	grunt.initConfig ({
		pkg: grunt.file.readJSON('package.json'),
		connect: {
			options: {
				base: '.'
			},
			dev: {
				options: {
					keepalive: true,
					port: 15009
				}
			},
			test: {
				options: {
					keepalive: false,
					port: 3001
				}
			}
		},
		qunit: {
			tests: {
				options: {
					httpBase: 'http://localhost:3001'
				},
				src: 'test/index.html'
			}
		},
		clean: {
			release: {
				src: ['dist/'],
			},
		},
		concat: {
			sourceCode: {
				src: [
					'src/iugo-core.js',
					'src/iugo-bind_to_dom.js',
					'src/iugo-events.js',
					'src/iugo-http.js'
				],
				dest: 'dist/iugo.js'
			}
		},
		closurecompiler: {
			min: {
				files: {
					'dist/iugo.min.js': 'dist/iugo.js'
				},
				options: {
					language_in: 'ECMASCRIPT5_STRICT',
					banner: '/* copyright Factmint Ltd 2014, Licence MIT, author chris.scott@factmint.com */'
				}
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-qunit');
	grunt.loadNpmTasks('grunt-contrib-connect');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-clean');
	//grunt.loadNpmTasks('grunt-contrib-requirejs');
	grunt.loadNpmTasks('grunt-closurecompiler');

	grunt.registerTask('serve', ['connect:dev']);
	grunt.registerTask('test', ['connect:test', 'qunit']);
	grunt.registerTask('release', ['clean', 'concat', 'closurecompiler']);

};

