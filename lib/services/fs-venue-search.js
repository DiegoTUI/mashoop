'use strict';
/*
 * TuiInnovation nodejs.
 * FSVenueSearch: performs a venue search in Foursquare
 * as documented in https://developer.foursquare.com/docs/venues/search
 *
 * Copyright (C) 2013 TuiInnovation.
 */
//requires
var log = require('../util/log.js');
var Foursquare = require('foursquarevenues');
var foursquareConfig = require('./config/foursquare.js');
var testing = require('testing');

/**
 * The FSVenueSearch request.
 * queryParameters: the parameters to perform the call
 */
exports.FSVenueSearch = function(queryParameters) {
	// self-reference
	var self = this;
	//debug mode
	var debug = ('debug' in queryParameters);
	/**
	 * Sends the ajax request to the apropriate url with the right xml and query parameters
	 * callback follows the function(error, result) nodejs convention
	 */
	self.sendRequest = function(callback) {
		var foursquare = Foursquare (foursquareConfig.clientId, foursquareConfig.clientSecret);

		foursquare.getVenues(queryParameters, processResponse);

		/**
		 * Process the response received by FourSquare and calls callback
		 */
		 function processResponse(error, result) {
			if (error) {
				log.debug ('Error returned by FourSquare Venue Search: ' + JSON.stringify(error));
				callback(error);
			} else {
				if ('response' in result) {
					callback(null, result.response);
				} else {
					callback(null, {});
				}
			}
		 }
	};

	return self;
};
/***********************************
 ************ UNIT TESTS ***********
 ***********************************/
function testValidVenueSearch(callback) {
	function fsCallback (error, result) {
		testing.assert(error === null, 'Valid request to FourSquare returned an error: ' + JSON.stringify(error), callback);
		log.debug('number of objects in the reply: ' + result.venues.length);
		result.venues.forEach(function(venue){
			testing.assert('id' in venue, 'Element with no id retrieved: ' + JSON.stringify(venue), callback);
		});
		testing.success(callback);
	}
	var parameters = {
		near: 'Palma de Mallorca',
		intent: 'browse',
		radius: '500'
	};

	var fsVenueSearch = new exports.FSVenueSearch(parameters);
	fsVenueSearch.sendRequest(fsCallback);
}

exports.test = function(callback) {
	testing.run({
		testValidVenueSearch: testValidVenueSearch
	}, 100000, callback);
};

 // start tests if invoked directly
if (__filename == process.argv[1]) {
    exports.test(testing.show);
}
