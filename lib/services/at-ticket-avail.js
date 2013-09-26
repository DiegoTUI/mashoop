'use strict';
/*
 * TuiInnovation nodejs.
 * ATTicketAvail: performs a TicketAvail request to ATLAS and returns the results
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
var TICKETS_CACHED_SECONDS = 24 * 3600;
var PARAMETER_MAP = {
	destination: 'Destination_code',
	from: 'DateFrom_date',
	to: 'DateTo_date',
	language: 'Language',
	adults: 'ServiceOccupancy_AdultCount',
	pagesize: 'PaginationData_itemsPerPage'
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
exports.ATTicketAvail = function(queryParameters, descriptionMap, tag, forceCall) {
	// self-reference
	var self = this;
	//debug mode
	var debug = ("debug" in queryParameters);
	// Initialize service parameters
	var serviceParameters = {};
	initParameters();
	descriptionMap = descriptionMap || atlasDefaults.ticketAvailDescriptionMap;
	tag = tag || atlasDefaults.ticketAvailTag;

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
				log.debug("Memcached found for key " + key);
				return callback(null, result);
			} 
			log.debug("Memcached didn't find anything for " + key + ". making the actual request");
			makeRequest(function(error, result) {
				callback(error, result);
				// after processing, store in memcached if valid
				if (!error && result) {
					memcached.set(key, result, TICKETS_CACHED_SECONDS, function() {});
				} 
			});
		});
	}

	/**
	 * Get the key for memcached.
	 */
	function getMemcachedKey(parameters) {
		return 'ticket#' + serviceParameters.Destination_code + '#' + serviceParameters.Language + "#" + serviceParameters.DateFrom_date + '#' + serviceParameters.DateTo_date;
	}

	/**
	 * Sends the ajax request to the apropriate url with the right xml and query parameters.
	 */
	function makeRequest(callback) {
		log.debug('Making ATLAS request...');
		var parametrizedRequest = new ParametrizedString(atlas.ticketAvailRequest, serviceParameters);
		var form = {xml_request: parametrizedRequest.replaceAllClean()};
		var options = {
			url: atlas.url,
			form: form,
			method: "POST",
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
			log.debug("parsing errors ...");
			var errorReader = new XmlReader (result, atlasDefaults.errorDescriptionMap);
			errorReader.readObjects(function(errorParsing, parsedErrors){
				if ("ErrorList" in parsedErrors) {	//There were errors coded in the response
					var errorToSend = {
						error: "004-bad-request",
						statusCode: 400,
						description: "Faulty TicketAvail request made to Atlas. See stack trace for details",
						contact: "dlafuente@tuitravel-ad.com"
					};
					if (debug) {
						errorToSend.stack = JSON.stringify(parsedErrors.ErrorList);
					}
					return callback(errorToSend);
				}
				log.debug("No errors. Parsing response ...");
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
		for (var parameter in PARAMETER_MAP) {
			if (parameter in queryParameters) {
				var key = PARAMETER_MAP[parameter];
				var value = queryParameters[parameter];
				serviceParameters[key] = value;
			}
		}
		for (var key in atlasDefaults.ticketAvailRequest) {
			if (!(key in serviceParameters)) {
				if (typeof atlasDefaults.ticketAvailRequest[key] === "function") {
					serviceParameters[key] = atlasDefaults.ticketAvailRequest[key]();
				} else {
					serviceParameters[key] = atlasDefaults.ticketAvailRequest[key];
				}
			}
		}
	}

	return self;
}

/***********************************
 ************ UNIT TESTS ***********
 ***********************************/
var ticketAvailMap = [
{'DateFrom':'DateFrom.@date'},
{'DateTo':'DateTo.@date'},
'Currency',
{'CurrencyCode': 'Currency.@code'},
{'Name': 'TicketInfo.Name'},
{'TicketInfo.DescriptionList.Description':[{'Type': '@type'},
					 			{'Description': ''}]},
{'TicketInfo.ImageList.Image': [{'Type': 'Type'},
							{'Url': 'Url'}]}];

var ticketAvailMapAlt = [
{'TotalItems':'@totalItems'},
{'ServiceTicket':[{'DateFrom':'DateFrom.@date'},
	{'DateTo':'DateTo.@date'},
	'Currency',
	{'CurrencyCode': 'Currency.@code'},
	{'Name': 'TicketInfo.Name'},
	{'TicketInfo.DescriptionList.Description':[{'Type': '@type'},
					 			{'Description': ''}]},
	{'TicketInfo.ImageList.Image': [{'Type': 'Type'},
							{'Url': 'Url'}]}
	]}
];

function testTicketAvailRequest (callback) {
	function atlasCallback(error, result) {
		testing.assert(error === null, "Valid request to ATLAS returned an error: " + JSON.stringify(error), callback);
		log.debug("number of serviceTickets in the reply: " + result.ServiceTicketList.length);
		testing.assertEquals(result.ServiceTicketList.length, parseInt(result.TotalItems), "Wrong number of items retrieved", callback);
		testing.success(callback);
	}
	var parameters = {
		language: "ENG",
		adults: "1",
		debug: true
	};

	var ticketAvailRQ = new exports.ATTicketAvail(parameters, ticketAvailMapAlt);
	ticketAvailRQ.sendRequest(atlasCallback);
}

function testTicketAvailRequestNoDescriptionMap (callback) {
	function atlasCallback(error, result) {
		testing.assert(error === null, "Valid request to ATLAS returned an error: " + JSON.stringify(error), callback);
		log.debug("number of serviceTickets in the reply: " + result.ServiceTicketList.length);
		testing.assertEquals(result.ServiceTicketList.length, parseInt(result.TotalItems), "Wrong number of items retrieved", callback);
		testing.success(callback);
	}
	var parameters = {
		language: "ENG",
		adults: "1"
	};

	var ticketAvailRQ = new exports.ATTicketAvail (parameters);
	ticketAvailRQ.sendRequest(atlasCallback);
}

function testTicketAvailRequestErrors (callback) {
	function atlasCallback(error, result) {
		testing.assert(error != null, "Invalid request to ATLAS returned no errors.", callback);
		testing.assertEquals(error.statusCode, 400, "wrong status code returned", callback);
		testing.assertEquals(error.error, "004-bad-request", "Wrong error code", callback);
		testing.assert(error.stack != null, "Invalid request to ATLAS in debug mode returned no stack.", callback);
		testing.success(callback);
	}
	var parameters = {
		language: "SPA",	//UNEXISTING LANGUAGE!!!
		adults: "1",
		debug: true
	};

	var ticketAvailRQ = new exports.ATTicketAvail(parameters);
	ticketAvailRQ.sendRequest(atlasCallback);
}

function testTicketAvailRequestWrongTag (callback) {
	function atlasCallback(error, result) {
		if (!config.ticketCacheResults) { //only perform test if we are NOT caching results
			testing.assert(error != null, "Invalid tag request to ATLAS returned no errors.", callback);
			testing.assertEquals(error.statusCode, 500, "wrong status code returned", callback);
			testing.assertEquals(error.error, "005-xml-parsing-error", "wrong error returned", callback);
			testing.assert(error.stack != null, "Wrong tag in debug mode did not return a stack", callback);
		}
		testing.success(callback);
	}
	var parameters = {
		language: "ENG",
		adults: "1",
		debug: true
	};

	var ticketAvailRQ = new exports.ATTicketAvail(parameters, ticketAvailMap, "WrongTag");
	ticketAvailRQ.sendRequest(atlasCallback);
}

exports.test = function(callback) {
	testing.run({
		testTicketAvailRequest: testTicketAvailRequest,
		testTicketAvailRequestNoDescriptionMap: testTicketAvailRequestNoDescriptionMap,
		testTicketAvailRequestErrors: testTicketAvailRequestErrors,
		testTicketAvailRequestWrongTag: testTicketAvailRequestWrongTag
	}, function(error, result) {
		memcached.end();
		callback(error, result);
	});
}

 // start tests if invoked directly
if (__filename == process.argv[1]) {
    exports.test(testing.show);
}
