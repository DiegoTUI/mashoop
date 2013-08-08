'use strict';
/*
 * TuiInnovation nodejs.
 * FSVenueSearch: performs a venue search in Foursquare
 * as documented in https://developer.foursquare.com/docs/venues/search
 *
 * Copyright (C) 2013 TuiInnovation.
 */

 var log = require('../util/log.js');

/**
 * The FSVenueSearch request.
 * queryParameters: the parameters to perform the call
 */
var FSVenueSearch = function(queryParameters)
{
	// self-reference
	var self = this;

	//requires
	var querystring = require('querystring');
	var util = require('../util/util.js');
	var ajax = require('../io/ajax.js').ajax;
	var fourSquare = require('./config/foursquare.js');

	/**
	 * Sends the ajax request to the apropriate url with the right xml and query parameters
	 * callback follows the function(error, result) nodejs convention
	 */
	self.sendRequest = function(callback) {
		//fill in default parameters
		queryParameters["client_id"] = fourSquare.clientId;
		queryParameters["client_secret"] = fourSquare.clientSecret;
		queryParameters["v"] = util.atlasDate(new Date());
		//make the call
		var options = {
			url: fourSquare.venueSearchUrl + "?" + querystring.stringify(queryParameters)
		};
		ajax.send(options, processResponse);

		/**
		 * Process the response received by FourSquare nad calls callback
		 */
		 function processResponse(error, result) {
		 	if (error) {
		 		error = JSON.parse(error.error);
		 		log.info ("Error returned by FourSquare Venue Search: " + JSON.stringify(error));
		 		callback({code:error.meta.code, type:error.meta.errorType});
		 	} else {
		 		result = JSON.parse(result);
		 		if ("response" in result) {
		 			callback(null, result.response);
		 		} else {
		 			callback(null, {});
		 		}
		 	}
		 }
	}

	return self;
}

exports.FSVenueSearch = FSVenueSearch;

/***********************************
 ************ UNIT TESTS ***********
 ***********************************/
var testing = require('testing');

function testValidVenueSearch(callback) {
	function fsCallback (error, result) {
		testing.assert(error === null, "Valid request to FourSquare returned an error: " + JSON.stringify(error), callback);
		log.info("number of objects in the reply: " + result.venues.length);
		result.venues.forEach(function(venue){
			testing.assert("id" in venue, "Element with no id retrieved: " + JSON.stringify(venue), callback);
		});
		testing.success(callback);
	}
	var parameters = {
		near: "Palma de Mallorca",
		intent: "browse",
		radius: "500"
	};

	var fsVenueSearch = new FSVenueSearch(parameters);
	fsVenueSearch.sendRequest(fsCallback);
}

function testInvalidVenueSearch (callback) {
	function fsCallback (error, result) {
		log.info("Error returned by fsvenuesearch: " + JSON.stringify(error));
		testing.assert(error != null, "Invalid request to FourSquare did not return an error.", callback);
		testing.assertEquals(error.code, 400, "wrong error code returned", callback);
		testing.assertEquals(error.type, "param_error", "wrong error type returned", callback);
		testing.success(callback);
	}
	var parameters = {
		intent: "browse",
		radius: "500"
	};

	var fsVenueSearch = new FSVenueSearch(parameters);
	fsVenueSearch.sendRequest(fsCallback);
}

exports.test = function(callback) {
	testing.run({
		testValidVenueSearch: testValidVenueSearch,
		testInvalidVenueSearch: testInvalidVenueSearch
	}, 100000, callback);
}

 // start tests if invoked directly
if (__filename == process.argv[1])
{
    exports.test(testing.show);
}