'use strict';
/**
 * TuiInnovation
 * FSVenueSearch unit tests
 *
 * Copyright (C) 2013 TuiInnovation.
 */

var FSVenueSearch = require('../services/FSVenueSearch.js');

/* run tests */
exports.validVenueSearch = function (test) {
	function ok(result)
	{
		console.log("number of objects in the reply: " + result.venues.length);
		result.venues.forEach(function(venue){
			test.ok("id" in venue, "Element with no id retrieved: " + JSON.stringify(venue));
		});
		test.done();
	}

	function nok(result)
	{
		var message = result.error ? 'test failed with status code ' + result.statusCode + ' and error: ' + JSON.stringify(result.error) : 'test failed with status code ' + result.statusCode;
		test.ok(false, message);
		test.done();
	}
	var parameters = {
		near: "Palma de Mallorca",
		intent: "browse",
		radius: "500"
	};

	var fsVenueSearch = new FSVenueSearch(parameters);
	fsVenueSearch.sendRequest(ok, nok);
}

exports.invalidVenueSearch = function (test) {
	test.expect(2);
	function ok(result)
	{
		test.ok(false, "Should not return ok when performing an invalid request");
		test.done();
	}

	function nok(result)
	{
		var error = result.error;
		test.ok(error.code == 400, "wrong error code returned");
		test.ok(error.errorType == "param_error", "wrong error type returned");
		test.done();
	}
	var parameters = {
		intent: "browse",
		radius: "500"
	};

	var fsVenueSearch = new FSVenueSearch(parameters);
	fsVenueSearch.sendRequest(ok, nok);
}
