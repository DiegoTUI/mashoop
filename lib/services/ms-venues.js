'use strict';
/*
 * TuiInnovation nodejs.
 * MSVenues: performs a search in different external sources and returns the results.
 * The input parameters are:
 * ll=(latitude,longitude)
 *
 * Copyright (C) 2013 TuiInnovation.
 */
//requires
var log = require('../util/log.js');
var FSVenueSearch = require('./fs-venue-search.js').FSVenueSearch;
var YPSearch = require('./yp-search.js').YPSearch;
var async = require('async');
var testing = require('testing');

/**
 * The MSVenues request.
 * queryParameters: the parameters to perform the call
 */
exports.MSVenues = function(queryParameters) {
	// self-reference
	var self = this;
	//debug mode
	var debug = ('debug' in queryParameters);
	/**
	 * Calls several services in parallel and processes the results
	 * callback follows the function(error, result) nodejs convention
	 */
	self.sendRequest = function(callback) {
		// create the stream of calls
		var fsVenueSearch = new FSVenueSearch (queryParameters);
		var ypSearch = new YPSearch (queryParameters);
		var stream = {};
		stream.foursquare = fsVenueSearch.sendRequest;
		stream.yelp = ypSearch.sendRequest;
		// launch the stream of calls in parallel
		async.parallel(stream, processResponse);

		/**
		 * Process the response received by the parallel call and call back
		 */
		 function processResponse(error, result) {
			if (error) {
				log.debug ('Error returned by async parallel Search: ' + JSON.stringify(error));
				callback(error);
			} else {
				callback(null, result);
			}
		 }
	};

	return self;
};
/***********************************
 ************ UNIT TESTS ***********
 ***********************************/
function testValidMashoopVenues(callback) {
	function msCallback (error, result) {
		testing.assert(error === null, 'Valid request to Mashoop venues returned an error: ' + JSON.stringify(error), callback);
		testing.assert(result.yelp, 'Valid request to Mashoop venues did not return any yelp result', callback);
		testing.assert(result.foursquare, 'Valid request to Mashoop venues did not return any foursquare result', callback);
		log.debug('yelp returned ' + result.yelp.businesses.length + ' venues');
		log.debug('foursquare returned ' + result.foursquare.venues.length + ' venues');
		// yelp
		result.yelp.businesses.forEach(function(venue){
			testing.assert('id' in venue, 'Element with no id retrieved: ' + JSON.stringify(venue), callback);
		});
		// foursquare
		result.foursquare.venues.forEach(function(venue){
			testing.assert('id' in venue, 'Element with no id retrieved: ' + JSON.stringify(venue), callback);
		});
		testing.success(callback);
	}
	var parameters = {
		ll: '40.416775,-3.70379'
	};

	var msVenues = new exports.MSVenues(parameters);
	msVenues.sendRequest(msCallback);
}

exports.test = function(callback) {
	testing.run({
		testValidMashoopVenues: testValidMashoopVenues
	}, 100000, callback);
};

 // start tests if invoked directly
if (__filename == process.argv[1]) {
    exports.test(testing.show);
}
