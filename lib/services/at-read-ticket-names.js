'use strict';
/*
 * TuiInnovation nodejs.
 * ReadTicketNames: returns an array with the names of the tickets 
 * for a specific location and language
 *
 * Copyright (C) 2013 TuiInnovation.
 */
//requires
var log = require('../util/log.js');
var config = require('../config.js');
var db = require('../util/db.js');
var testing = require('testing');
var async = require('async');
var Memcached = require('memcached');

// globals
var memcached = new Memcached('127.0.0.1:11211');
var ticketCollection = null;

// constants
var TICKETS_CACHED_SECONDS = 24 * 3600;

// init
db.addCallback(function() {
	ticketCollection = db.getCollection('tickets');
});


/**
 * The ReadTicketNames request.
 * queryParameters: the parameters to perform the call
 */
exports.ATReadTicketNames = function(queryParameters) {
	// self-reference
	var self = this;
	//debug mode
	var debug = ("debug" in queryParameters);
	/**
	 * Sends the request to mongo
	 * callback follows the function(error, result) nodejs convention
	 */
	self.sendRequest = function(callback) {
		if (!validQueryParameters(["destination", "language"])) {
			var errorToSend = {
				error: "004-bad-request",
				statusCode: 400,
				description: 'Both "language" and "destination" are mandatory for this service',
				contact: "dlafuente@tuitravel-ad.com"};
			return callback(errorToSend);
		}
		if (!config.ticketCacheResults) {
			return makeRequest(callback);
		}
		var key = getMemcachedKey(queryParameters);
                memcached.get(key, function(error, result) {
                        if (error) {
                                // memcached not working, log and ignore
                                log.error('Could not find key ' + key + ' in memcached: ' + error);
                        }
                        if (!error && result) {
                                // data found in memcached, use it
                                return callback(null, result);
                        }
                        return makeRequest(function(error, result) {
                                callback(error, result);
                                // after processing, store in memcached if valid
                                if (!error && result)
                                {
                                        memcached.set(key, result, TICKETS_CACHED_SECONDS, function() {});
                                }
                        });
                });
	}


	/**
	 * Get the key for memcached.
	 */
	function getMemcachedKey(parameters) {
		return 'ticket#' + parameters.destination + '#' + parameters.language;
	}

	/**
	 * Make the actual request to MongoDB.
	 */
	function makeRequest(callback) {
		if (!ticketCollection) {
			var errorToSend = {
				error: '007-db-access-error',
				statusCode: 500,
				description: "There was an error when trying to access the database",
				contact: "dlafuente@tuitravel-ad.com",
			};
			if (debug) {
				errorToSend.stack = JSON.stringify(new Error());
			}
			return callback(errorToSend);
		}
		var params = {destinationCode: queryParameters.destination};
		var options = {name: 1};
		ticketCollection.find(params, options, function(error, result) {
			if (error) {
				var errorToSend = {error:"007-db-access-error", 
					statusCode: 500,
					description: "There was an error when trying to access the database",
					contact: "dlafuente@tuitravel-ad.com",
				};
				if (debug) {
					errorToSend["stack"] = JSON.stringify(error);
				}
				return callback(errorToSend);
			}
			var names = [];
			docs.forEach(function(doc) {
				if (doc.name[queryParameters.language]) {
					names.push(doc.name[queryParameters.language]);
				}
			});
			callback(null, names);
		});
	}

	/**
	 * Checks that all the compulsory parameters are in "queryParameters"
	 * mandatory: an array of strings containing the mandatory parameters
	 * returns true if all the mandatory parameters are in the query
	 */
	function validQueryParameters(mandatory) {
		var result = true;
		mandatory.forEach(function(parameter) {
			if (!(parameter in queryParameters)) {
				result = false;
			}
		});
		return result;
	}

	return self;
}
/***********************************
 ************ UNIT TESTS ***********
 ***********************************/
function testValidReadTicketNames(callback) {
	function rtnCallback (error, result) {
		testing.assert(error === null, "Valid request to ReadTicketNames returned an error: " + JSON.stringify(error), callback);
		testing.assert(result instanceof Array, "Valid request to ReadTicketNames did not return an array", callback);
		log.info("number of objects in the reply: " + result.length);
		result.forEach(function(name){
			testing.assertEquals(typeof name, "string", "Name not a string", callback);
		});
		testing.success(callback);
	}
	var parameters = {
		destination: "BCN",
		language: "ENG",
		debug: true
	};

	var readTicketNames = new exports.ATReadTicketNames(parameters);
	readTicketNames.sendRequest(rtnCallback);
}

function testInvalidReadTicketNames(callback) {
	function rtnCallback (error, result) {
		testing.assert(error != null, "Invalid request to ReadTicketNames did NOT return an error.", callback);
		testing.assertEquals(error.error, "004-bad-request", "wrong error code", callback);
		testing.success(callback);
	}
	var parameters = {
		language: "ENG",
		debug: true
	};

	var readTicketNames = new exports.ATReadTicketNames(parameters);
	readTicketNames.sendRequest(rtnCallback);
}

function testInvalidDestinationReadTicketNames(callback) {
	function rtnCallback (error, result) {
		testing.assert(error === null, "Valid request to ReadTicketNames returned an error: " + JSON.stringify(error), callback);
		testing.assert(result instanceof Array, "Valid request to ReadTicketNames did not return an array", callback);
		log.info("number of objects in the reply: " + result.length);
		testing.assertEquals(result.length, 0, "unexisting destination should return 0 results", callback);
		testing.success(callback);
	}
	var parameters = {
		destination: "Unexisting",
		language: "ENG",
		debug: true
	};

	var readTicketNames = new exports.ATReadTicketNames(parameters);
	readTicketNames.sendRequest(rtnCallback);
}

function testInvalidLanguageReadTicketNames(callback) {
	function rtnCallback (error, result) {
		testing.assert(error === null, "Valid request to ReadTicketNames returned an error: " + JSON.stringify(error), callback);
		testing.assert(result instanceof Array, "Valid request to ReadTicketNames did not return an array", callback);
		log.info("number of objects in the reply: " + result.length);
		testing.assertEquals(result.length, 0, "unexisting language should return 0 results", callback);
		testing.success(callback);
	}
	var parameters = {
		destination: "BCN",
		language: "Unexisting",
		debug: true
	};

	var readTicketNames = new exports.ATReadTicketNames(parameters);
	readTicketNames.sendRequest(rtnCallback);
}

exports.test = function(callback) {
	testing.run({
		testValidReadTicketNames: testValidReadTicketNames,
		testInvalidReadTicketNames: testInvalidReadTicketNames,
		testInvalidDestinationReadTicketNames: testInvalidDestinationReadTicketNames,
		testInvalidLanguageReadTicketNames: testInvalidLanguageReadTicketNames
	}, callback);
}

 // start tests if invoked directly
if (__filename == process.argv[1]) {
    exports.test(testing.show);
}
