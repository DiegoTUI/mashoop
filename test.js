'use strict';

/**
 * Run package tests.
 * (C) 2013 TuiInnovation.
 */

// requires
var testing = require('testing');

process.setMaxListeners(0);

/**
 * Run all module tests.
 */
exports.test = function(callback) {
	var tests = {};
	var files = {};
	files.lib = [ 'app', 'db' ];
	files['lib/io'] = [ 'ajax', 'parametrized-string', 'xml-reader', 'json-formatter' ];
	files['lib/services'] = ['at-ticket-avail', 'fs-venue-search', 'at-read-ticket-names', 'at-hotel-list', 'at-hotel-detail', 'ms-hotel-list'];
	files['lib/util'] = [ 'core' ];
	files['lib/batch'] = ['ticket-avail-parser', 'hotel-parser'];
	for (var path in files) {
		for (var i=0; i<files[path].length; i++) {
			var file = files[path][i];
			tests[path + '/' + file] = require('./' + path + '/' + file + '.js').test;
		}
	}
	testing.run(tests, 100000, callback);
};

// run tests if invoked directly
if (__filename == process.argv[1])
{
	exports.test(testing.show);
}
