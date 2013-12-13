'use strict';
/*
 * TuiInnovation nodejs.
 * YPSearch: performs a search in yelp
 * as documented in http://www.yelp.com/developers/documentation/v2/search_api
 *
 * Copyright (C) 2013 TuiInnovation.
 */
//requires
var log = require('../util/log.js');
var yelp = require('yelp');
var yelpConfig = require('./config/yelp.js');
var testing = require('testing');

/**
 * The YPSearch request.
 * queryParameters: the parameters to perform the call
 */
exports.YPSearch = function(queryParameters) {
	// self-reference
	var self = this;
	//debug mode
	var debug = ('debug' in queryParameters);
	/**
	 * Calls the yelp search service using the yelp module
	 * callback follows the function(error, result) nodejs convention
	 */
	self.sendRequest = function(callback) {
		var yelpClient = yelp.createClient({
			consumer_key: yelpConfig.consumerKey,
			consumer_secret: yelpConfig.consumerSecret,
			token: yelpConfig.token,
			token_secret: yelpConfig.tokenSecret
		});
		
		yelpClient.search (queryParameters, processResponse);

		/**
		 * Process the response received by yelp and call back
		 */
		 function processResponse(error, result) {
			if (error) {
				log.debug ('Error returned by Yelp Search: ' + JSON.stringify(error));
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
function testValidYelpSearch(callback) {
	function ypCallback (error, result) {
		testing.assert(error === null, 'Valid request to FourSquare returned an error: ' + JSON.stringify(error), callback);
		log.debug('number of objects in the reply: ' + result.businesses.length);
		result.businesses.forEach(function(venue){
			testing.assert('id' in venue, 'Element with no id retrieved: ' + JSON.stringify(venue), callback);
		});
		testing.success(callback);
	}
	var parameters = {
		term: 'food',
		location: 'Montreal',
	};

	var ypSearch = new exports.YPSearch(parameters);
	ypSearch.sendRequest(ypCallback);
}

exports.test = function(callback) {
	testing.run({
		testValidYelpSearch: testValidYelpSearch
	}, 100000, callback);
};

 // start tests if invoked directly
if (__filename == process.argv[1]) {
    exports.test(testing.show);
}
