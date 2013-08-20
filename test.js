'use strict';

/**
 * Run package tests.
 * (C) 2013 TuiInnovation.
 */

// requires
var testing = require('testing');

/**
 * Run all module tests.
 */
exports.test = function(callback)
{
	var tests = {};
	var files = {};
	files['lib'] = [ /*'app',*/ 'db' ];
	files['lib/io'] = [ 'ajax', 'parametrized-string', 'xml-reader' ];
	files['lib/services'] = [ 'at-ticket-avail', 'fs-venue-search', 'at-read-ticket-names'];
	files['lib/util'] = [ 'core' ];
	files['scripts/atlas/tickets'] = ['ticket-avail-parser'];
	for (var path in files) {
		files[path].forEach(function(file) {
			tests[path + "/" + file] = require('./' + path + '/' + file + '.js').test;
			//tests["extra"] = require("./lib/services/at-read-ticket-names.js").test;
		});
	}
	
	testing.run(tests, 100000, callback);
}

// run tests if invoked directly
if (__filename == process.argv[1])
{
	exports.test(testing.show);
}
