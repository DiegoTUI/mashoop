'use strict';
/*
 * TuiInnovation nodejs.
 * FSVenueSearch: performs a venue search in Foursquare
 * as documented in https://developer.foursquare.com/docs/venues/search
 *
 * Copyright (C) 2013 TuiInnovation.
 */

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
	var log = require('../util/log.js');
	var ajax = require('../io/ajax.js');
	var fourSquare = require('./config/fourSquare.js');

	/**
	 * Sends the ajax request to the apropriate url with the right xml and query parameters
	 * ok: callback in case of ok
	 * nok: callback in case of not ok
	 */
	self.sendRequest = function(ok, nok) {
		//fill in default parameters
		queryParameters["client_id"] = fourSquare.clientId;
		queryParameters["client_secret"] = fourSquare.clientSecret;
		queryParameters["v"] = util.atlasDate(new Date());
		//make the call
		var url = fourSquare.venueSearchUrl + "?" + querystring.stringify(queryParameters);
		ajax.send({}, url, util.process([parseResponse, ok]), util.process([parseError, nok]), 'GET');
	}

	/**
	 * Parses the json received, looks for errors and returns the appropriate response
	 * data: the json response received
	 */
	function parseResponse(data) {
		data = JSON.parse(data);
		if ("response" in data) {
			return data.response;
		}
		return {};
	}

	/**
	 * Parses the json received when it's an error
	 * data: the json response received
	 */
	 function parseError(data) {
	 	var error = JSON.parse(data.error);
	 	log.info("Parsing error: " + JSON.stringify(error));
	 	if ("meta" in error) {
			return {error: error.meta, statusCode: data.statusCode};
		}
		return {};
	 }

	return self;
}

module.exports = FSVenueSearch;

