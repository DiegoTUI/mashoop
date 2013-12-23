'use strict';
/*
 * TuiInnovation nodejs.
 * ATTicketValuation: performs a TicketValuation request to ATLAS and returns the results
 *
 * Copyright (C) 2013 TuiInnovation.
 */
//requires
var log = require('../util/log.js');
var ParametrizedString = require('../io/parametrized-string.js').ParametrizedString;
var XmlReader = require('../io/xml-reader.js').XmlReader;
var JsonReader = require('../io/json-reader.js').JsonReader;
var ajax = require('../io/ajax.js').ajax;
var config = require('../config.js');
var atlas = require('./config/atlas.js');
var atlasDefaults = require('./config/atlas-defaults.js');
var testing = require('testing');
var Memcached = require('memcached');

// constants
var ITEMS_CACHED_SECONDS = 24 * 3600;

//globals
var memcached = new Memcached('127.0.0.1:11211');

/**
 * The TicketValuation request in Atlas.
 * queryParameters: the parameters to build the xml and perform the call
 * descriptionMap: the json describing wich fields you want to read from the xml
 * tag: the tag to indicate which objects in the xml should we look for. Root if undefined or null
 * forceCall: if true, ignores the cache settings in config.js and forces the call to ATLAS
 */
exports.ATTicketValuation = function(queryParameters, descriptionMap, tag, forceCall) {
	// self-reference
	var self = this;
	//debug mode
	var debug = ('debug' in queryParameters);
	// default request
	var defaultRequest = atlasDefaults.ticketValuationRequest;
	// Initialize parameters
	initParameters();
	descriptionMap = descriptionMap || atlasDefaults.ticketValuationDescriptionMap;
	tag = tag || atlasDefaults.ticketValuationTag;

	/**
	 * Send the request to get tickets.
	 * callback follows the function(error, result) nodejs convention
	 */
	self.sendRequest = function(callback) {
		if (!config.ticketCacheResults || forceCall) {
			return makeRequest(callback);
		}
		var key = getMemcachedKey(queryParameters);
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
					memcached.set(key, result, ITEMS_CACHED_SECONDS, function() {});
				}
			});
		});
	};

	/**
	 * Get the key for memcached.
	 */
	function getMemcachedKey(parameters) {
		return 'ticket#' + parameters.availToken + '#' + parameters.ticket + '#' + parameters.modality +'#' + parameters.language + '#' + parameters.from + '#' + parameters.to + '#' + parameters.adults + '#' + parameters.children;
	}

	/**
	 * Sends the ajax request to the apropriate url with the right xml and query parameters.
	 */
	function makeRequest(callback) {
		log.debug('Making TicketValuation ATLAS request...');
		var parametrizedRequest = new ParametrizedString(atlas.ticketValuationRequest, queryParameters);
		var jsonReader = new JsonReader(JSON.parse(parametrizedRequest.replaceAllClean()));
		jsonReader.produceXml (function(error, xmlString) {
			if (error) {
				return callback (error);
			}
			var form = {xml_request: xmlString};
			var options = {
				url: atlas.url,
				form: form,
				method: 'POST',
				debug: debug
			};
			ajax.send(options, checkForErrors);
		});

		/**
		 * Checks for errors in both the error parameter and the body of the response
		 */
		function checkForErrors(error, result) {
			//If there is an error, we return an error
			if (error) {
				return callback(error);
			}
			//No errors in the error parameter, let's look in the response
			log.debug('parsing errors ...');
			var errorReader = new XmlReader (result, atlasDefaults.errorDescriptionMap);
			errorReader.readObjects(function(errorParsing, parsedErrors){
				if ('ErrorList' in parsedErrors) {	//There were errors coded in the response
					var errorToSend = {
						error: '004-bad-request',
						statusCode: 400,
						description: 'Faulty TicketValuation request made to Atlas. See stack trace for details',
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
		for (var key in defaultRequest) {
			if (!(key in queryParameters)) {
				if (typeof defaultRequest[key] === 'function') {
					queryParameters[key] = defaultRequest[key]();
				} else {
					queryParameters[key] = defaultRequest[key];
				}
			}
		}
	}

	return self;
};

/***********************************
 ************ UNIT TESTS ***********
 ***********************************/
function testTicketValuationRequestErrors (callback) {
	function atlasCallback(error/*, result*/) {
		testing.assert(error !== null, 'Invalid request to ATLAS returned no errors.', callback);
		testing.assertEquals(error.statusCode, 400, 'wrong status code returned', callback);
		testing.assertEquals(error.error, '004-bad-request', 'Wrong error code', callback);
		testing.assert(error.stack !== null, 'Invalid request to ATLAS in debug mode returned no stack.', callback);
		testing.success(callback);
	}
	var parameters = {
		//void parameters will produce an invalid availtoken error
		debug: true
	};

	var ticketValuationRQ = new exports.ATTicketValuation(parameters);
	ticketValuationRQ.sendRequest(atlasCallback);
}

exports.test = function(callback) {
	testing.run({
		testTicketValuationRequestErrors: testTicketValuationRequestErrors
	}, 100000, function(error, result) {
		memcached.end();
		callback(error, result);
	});
};

 // start tests if invoked directly
if (__filename == process.argv[1]) {
    exports.test(testing.show);
}
