'use strict';

/**
 * Run package tests.
 * (C) 2013 TuiInnovation.
 */

// requires
var testing = require('testing');
var db = require('./lib/db.js');
var log = require('./lib/util/log.js');

/**
 * Run all module tests.
 */
exports.test = function(callback)
{
	var tests = {};
	var files = {};
	files['lib'] = [ 'app', 'db' ];
	files['lib/io'] = [ 'ajax', 'parametrized-string', 'xml-reader' ];
	files['lib/services'] = [ 'at-ticket-avail', 'fs-venue-search', 'at-read-ticket-names' ];
	files['lib/util'] = [ 'core' ];
	files['scripts/atlas/tickets'] = ['ticket-avail-parser'];
	for (var path in files) {
		files[path].forEach(function(file) {
			tests[path + "/" + file] = require('./' + path + '/' + file + '.js').test;
		});
	}
	testing.run(tests, 100000, function(error, result) {
		//close database
		db.close(function(error) {
			log.info("db closed");
			callback (error, result);
		});
	});
}

// run tests if invoked directly
if (__filename == process.argv[1])
{
	exports.test(testing.show);
}
