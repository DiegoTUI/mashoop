'use strict';
/**
 * TuiInnovation
 * FSVenueSearch unit tests
 *
 * Copyright (C) 2013 TuiInnovation.
 */

var FSVenueSearch = require('../services/FSVenueSearch.js').FSVenueSearch;
var log = require('../util/log.js');

/* run tests */
exports.testValidVenueSearch = function (test) {
	function fsCallback (error, result) {
		test.ok(error === null, "Valid request to FourSquare returned an error: " + JSON.stringify(error));
		log.info("number of objects in the reply: " + result.venues.length);
		result.venues.forEach(function(venue){
			test.ok("id" in venue, "Element with no id retrieved: " + JSON.stringify(venue));
		});
		test.done();
	}
	var parameters = {
		near: "Palma de Mallorca",
		intent: "browse",
		radius: "500"
	};

	var fsVenueSearch = new FSVenueSearch(parameters);
	fsVenueSearch.sendRequest(fsCallback);
}

exports.testInvalidVenueSearch = function (test) {
	test.expect(3);
	function fsCallback (error, result) {
		log.info("Error returned by fsvenuesearch: " + JSON.stringify(error));
		test.ok(error != null, "Invalid request to FourSquare did not return an error.");
		test.ok(error.code == 400, "wrong error code returned");
		test.ok(error.type === "param_error", "wrong error type returned");
		test.done();
	}
	var parameters = {
		intent: "browse",
		radius: "500"
	};

	var fsVenueSearch = new FSVenueSearch(parameters);
	fsVenueSearch.sendRequest(fsCallback);
}
