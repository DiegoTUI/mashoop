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
	var fourSquare = require('./config/fourSquare.js');

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
		ajax.send(options, processResponse);// util.process([parseResponse, ok]), util.process([parseError, nok]));

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

