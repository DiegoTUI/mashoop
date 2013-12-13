'use strict';
/*
 * TuiInnovation nodejs.
 * MSHotelList: returns an array with the hotels retrieved from mashoop's mongo db 
 * for a specific location and language
 *
 * Copyright (C) 2013 TuiInnovation.
 */
//requires
var log = require('../util/log.js');
var config = require('../config.js');
var db = require('../db.js');
var testing = require('testing');
var Memcached = require('memcached');

// globals
var memcached = new Memcached('127.0.0.1:11211');
var itemCollection = null;
var itemCollectionName = 'hotels';

// constants
var ITEMS_CACHED_SECONDS = 24 * 3600;
var DEFAULT_PAGE_SIZE = 50;
var DEFAULT_PAGE = 0;

/**
 * The ReadTicketNames request.
 * queryParameters: the parameters to perform the call
 */
exports.MSHotelList = function(queryParameters) {
	// self-reference
	var self = this;
	//debug mode
	var debug = ('debug' in queryParameters);
	initParameters();
	/**
	 * Sends the request to mongo
	 * callback follows the function(error, result) nodejs convention
	 */
	self.sendRequest = function(callback) {
		if (!validQueryParameters(['destination'])) {
			var errorToSend = {
				error: '004-bad-request',
				statusCode: 400,
				description: 'Both language and destination are mandatory for this service',
				contact: 'dlafuente@tuitravel-ad.com'};
			return callback(errorToSend);

		}
		if (!config.hotelCacheResults) {
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
	 * Debugs the parameters if needed
	 */
	 function initParameters () {
	 	queryParameters.pageSize = queryParameters.pageSize ? queryParameters.pageSize : DEFAULT_PAGE_SIZE;
	 	queryParameters.page = queryParameters.page ? queryParameters.page : DEFAULT_PAGE;
	 }

	/**
	 * Get the key for memcached.
	 */
	function getMemcachedKey(parameters) {
		return 'mshotellist#' + parameters.destination + '#' + parameters.language + '#' + parameters.pageSize + '#' + parameters.page;
	}

	/**
	 * Make the actual request to MongoDB.
	 */
	function makeRequest(callback) {
		db.addCallback(function() {
			itemCollection = db.getCollection(itemCollectionName);
			if (!itemCollection) {
				var errorToSend = {
					error: '007-db-access-error',
					statusCode: 500,
					description: 'There was an error when trying to access the database',
					contact: 'dlafuente@tuitravel-ad.com',
				};
				if (debug) {
					errorToSend.stack = JSON.stringify(new Error());
				}
				return callback(errorToSend);
			}
			var pageSize = parseInt (queryParameters.pageSize);
			var page = parseInt (queryParameters.page);
			var query = {destinationCode: queryParameters.destination,
							latitude:{'$ne':NaN},
							longitude:{'$ne':NaN}};
			var fields = {name: 1, latitude:1, longitude:1};
			var options = {skip: page * pageSize,
							limit: pageSize};

			itemCollection.find(query, fields, options, function(error, result) {
				if (error) {
					var errorToSend = {error:'007-db-access-error',
						statusCode: 500,
						description: 'There was an error when trying to access the database',
						contact: 'dlafuente@tuitravel-ad.com',
					};
					if (debug) {
						errorToSend.stack = JSON.stringify(error);
					}
					return callback(errorToSend);
				}
				result.toArray(function (error, results) {
					callback(null, results);
				});
			});
		});
	}

	/**
	 * Checks that all the compulsory parameters are in 'queryParameters'
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
};

/***********************************
 ************ UNIT TESTS ***********
 ***********************************/
function testValidHotelList(callback) {
	function rtnCallback (error, result) {
		testing.check(error, 'Valid call to msHotelList returned an error', callback);
		testing.assert(result instanceof Array, 'Valid request to msHotelList did not return an array', callback);
		testing.assertEquals (result.length, 5, 'Invalid number of hotels returned', callback);
		log.debug('Names returned: %s', result.length);
		if (result)
			result.forEach(function(hotel){
				testing.assert(hotel.name !== undefined, 'name cannot be undefined', callback);
				testing.assertEquals(typeof hotel.name, 'string', 'Name not a string', callback);
				testing.assert(hotel.latitude != NaN, 'latitude cannot be NaN', callback);
				testing.assert(hotel.longitude != NaN, 'longitude cannot be NaN', callback);
			});
		testing.success(callback);
	}
	var parameters = {
		destination: 'BCN',
		language: 'ENG',
		pageSize: 5,
		debug: true
	};

	var msHotelList = new exports.MSHotelList(parameters);
	msHotelList.sendRequest(rtnCallback);
}

function testInvalidHotelList (callback) {
	function rtnCallback (error/*, result*/) {
		testing.assert(error !== null, 'Invalid request to ReadTicketNames did NOT return an error.', callback);
		testing.assertEquals(error.error, '004-bad-request', 'wrong error code', callback);
		testing.success(callback);
	}
	var parameters = {
		language: 'ENG',
		debug: true
	};

	var msHotelList = new exports.MSHotelList(parameters);
	msHotelList.sendRequest(rtnCallback);
}

function testInvalidDestinationHotelList(callback) {
	function rtnCallback (error, result) {
		testing.check(error, 'Valid call to readTicketNames returned an error', callback);
		testing.assert(result instanceof Array, 'Valid request to ReadTicketNames did not return an array', callback);
		testing.assertEquals(result.length, 0, 'unexisting destination should return 0 results', callback);
		testing.success(callback);
	}
	var parameters = {
		destination: 'Unexisting',
		language: 'ENG',
		debug: true
	};

	var msHotelList = new exports.MSHotelList(parameters);
	msHotelList.sendRequest(rtnCallback);
}

exports.test = function(callback) {
	testing.run({
		testValidHotelList: testValidHotelList,
		testInvalidHotelList: testInvalidHotelList,
		testInvalidDestinationHotelList: testInvalidDestinationHotelList
	}, function(error, result) {
		log.debug('closing memcached...');
		memcached.end();
		db.close(function(/*err*/) {
			log.debug('closing mongo');
			callback (error, result);
		});
	});
};

// start tests if invoked directly
if (__filename == process.argv[1]) {
    exports.test(testing.show);
}
