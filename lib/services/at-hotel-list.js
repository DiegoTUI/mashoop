'use strict';
/*
 * TuiInnovation nodejs.
 * ATHotelList: performs a HotelList request to ATLAS and returns the results
 *
 * Copyright (C) 2013 TuiInnovation.
 */
//requires
var log = require('../util/log.js');
var ParametrizedString = require('../io/parametrized-string.js').ParametrizedString;
var XmlReader = require('../io/xml-reader.js').XmlReader;
var ajax = require('../io/ajax.js').ajax;
var config = require('../config.js');
var atlas = require('./config/atlas.js');
var atlasDefaults = require('./config/atlas-defaults.js');
var testing = require('testing');
var Memcached = require('memcached');

// constants
var HOTELS_CACHED_SECONDS = 24 * 3600;
var PARAMETER_MAP = {
	destination: 'Destination_code',
	language: 'Language'
};

//globals
var memcached = new Memcached('127.0.0.1:11211');

/**
 * The TicketAvail request in Atlas.
 * queryParameters: the parameters to build the xml and perform the call
 * descriptionMap: the json describing wich fields you want to read from the xml
 * tag: the tag to indicate which objects in the xml should we look for. Root if undefined or null
 * forceCall: if true, ignores the cache settings in config.js and forces the call to ATLAS
 */
exports.ATHotelList = function(queryParameters, descriptionMap, tag, forceCall) {
	// self-reference
	var self = this;
	//debug mode
	var debug = ('debug' in queryParameters);
	// Initialize service parameters
	var serviceParameters = {};
	initParameters();
	descriptionMap = descriptionMap || atlasDefaults.hotelListDescriptionMap;
	tag = tag || atlasDefaults.hotelListTag;

	/**
	 * Send the request to get hotels.
	 * callback follows the function(error, result) nodejs convention
	 */
	self.sendRequest = function(callback) {
		if (!config.hotelCacheResults || forceCall) {
			return makeRequest(callback);
		}
		var key = getMemcachedKey(serviceParameters);
		memcached.get(key, function(error, result) {
			if (error) {
				// memcached not working, log and ignore
				log.error('Error while finding key ' + key + ' in memcached: ' + error);
			}
			if (!error && result) {
				// data found in memcached, use it
				log.debug('Memcached found for key ' + key);
				return callback(null, result);
			}
			log.debug('Memcached didn\'t find anything for ' + key + '. making the actual request');
			makeRequest(function(error, result) {
				callback(error, result);
				// after processing, store in memcached if valid
				if (!error && result) {
					memcached.set(key, result, HOTELS_CACHED_SECONDS, function() {});
				}
			});
		});
	};

	/**
	 * Get the key for memcached.
	 */
	function getMemcachedKey(parameters) {
		return 'hotel#' + parameters.Destination_code + '#' + parameters.Language + '#' + parameters.DateFrom_date + '#' + parameters.DateTo_date;
	}

	/**
	 * Sends the ajax request to the apropriate url with the right xml and query parameters.
	 */
	function makeRequest(callback) {
		log.debug('Making HotelList ATLAS request...');
		var parametrizedRequest = new ParametrizedString(atlas.hotelListRequest, serviceParameters);
		var form = {xml_request: parametrizedRequest.replaceAllClean()};
		var options = {
			url: atlas.url,
			form: form,
			method: 'POST',
			debug: debug
		};
		ajax.send(options, checkForErrors);

		/**
		 * Checks for errors in both the error parameter and the body of the response
		 */
		function checkForErrors(error, result) {
			//If there is an error, we return an error
			if (error) {
				callback(error);
				return;
			}
			//No errors in the error parameter, let's look in the response
			log.debug('parsing errors ...');
			var errorReader = new XmlReader (result, atlasDefaults.errorDescriptionMap);
			errorReader.readObjects(function(errorParsing, parsedErrors){
				if ('ErrorList' in parsedErrors) {	//There were errors coded in the response
					var errorToSend = {
						error: '004-bad-request',
						statusCode: 400,
						description: 'Faulty TicketAvail request made to Atlas. See stack trace for details',
						contact: 'dlafuente@tuitravel-ad.com'
					};
					if (debug) {
						errorToSend.stack = JSON.stringify(parsedErrors.ErrorList);
					}
					return callback(errorToSend);
				}
				log.debug('No errors. Parsing response ...');
				var xmlReader = new XmlReader (result, descriptionMap, tag);
				xmlReader.readObjects(function(errorParsing, parsedResponse) {
					if (errorParsing) { //something went wrong when parsing
						if (debug) {
							errorParsing.stack = result;
						}
						return callback(errorParsing);
					}
					callback(null, parsedResponse);
				});
			});
		}
	}

	/**
	 * Check the query parameters and creates (if needed) some of the compulsory fields
	 * for the service params.
	 */
	function initParameters() {
		var key;
		for (var parameter in PARAMETER_MAP) {
			if (parameter in queryParameters) {
				key = PARAMETER_MAP[parameter];
				var value = queryParameters[parameter];
				serviceParameters[key] = value;
			}
		}
		for (key in atlasDefaults.ticketAvailRequest) {
			if (!(key in serviceParameters)) {
				if (typeof atlasDefaults.ticketAvailRequest[key] === 'function') {
					serviceParameters[key] = atlasDefaults.ticketAvailRequest[key]();
				} else {
					serviceParameters[key] = atlasDefaults.ticketAvailRequest[key];
				}
			}
		}
	}

	return self;
};

/***********************************
 ************ UNIT TESTS ***********
 ***********************************/

function testHotelListRequest (callback) {
	function atlasCallback(error, result) {
		testing.assert(error === null, 'Valid request to ATLAS returned an error: ' + JSON.stringify(error), callback);
		log.debug('number of hotels in the reply: ' + result.HotelList.length);
		testing.assertEquals(result.HotelList.length, parseInt(result.TotalItems, 10), 'Wrong number of items retrieved', callback);
		testing.success(callback);
	}
	var parameters = {
		language: 'ENG',
		debug: true
	};

	var hotelListRQ = new exports.ATHotelList(parameters);
	hotelListRQ.sendRequest(atlasCallback);
}

function testHotelListRequestErrors (callback) {
	function atlasCallback(error, result) {
		testing.assert(error !== null, 'Invalid request to ATLAS returned no errors.', callback);
		testing.assertEquals(error.statusCode, 400, 'wrong status code returned', callback);
		testing.assertEquals(error.error, '004-bad-request', 'Wrong error code', callback);
		testing.assert(error.stack !== null, 'Invalid request to ATLAS in debug mode returned no stack.', callback);
		testing.success(callback);
	}
	var parameters = {
		language: 'SPA',	//UNEXISTING LANGUAGE!!!
		debug: true
	};

	var hotelListRQ = new exports.ATHotelList(parameters);
	hotelListRQ.sendRequest(atlasCallback);
}

function testHotelListRequestWrongTag (callback) {
	function atlasCallback(error, result) {
		if (!config.hotelCacheResults) { //only perform test if we are NOT caching results
			testing.assert(error !== null, 'Invalid tag request to ATLAS returned no errors.', callback);
			testing.assertEquals(error.statusCode, 500, 'wrong status code returned', callback);
			testing.assertEquals(error.error, '005-xml-parsing-error', 'wrong error returned', callback);
			testing.assert(error.stack !== null, 'Wrong tag in debug mode did not return a stack', callback);
		}
		testing.success(callback);
	}
	var parameters = {
		language: 'ENG',
		debug: true
	};

	var hotelListRQ = new exports.ATHotelList(parameters, null, 'WrongTag');
	hotelListRQ.sendRequest(atlasCallback);
}

exports.test = function(callback) {
	testing.run({
		testHotelListRequest: testHotelListRequest,
		testHotelListRequestErrors: testHotelListRequestErrors,
		testHotelListRequestWrongTag: testHotelListRequestWrongTag
	}, function(error, result) {
		memcached.end();
		callback(error, result);
	});
};

 // start tests if invoked directly
if (__filename == process.argv[1]) {
    exports.test(testing.show);
}
