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
var mongo = require('mongodb');
var testing = require('testing');
var async = require('async');

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
			callback(errorToSend);
			return;
		}
		//get the data from mongo
		var server = new mongo.Server("127.0.0.1", mongo.Connection.DEFAULT_PORT, {});
		var db = new mongo.Db("mashoop", server, {w:1});
		async.waterfall([
			//Open db
			function (callback) {
				db.open(callback);
			},
			//open collection
			function (db, callback) {
				db.collection('tickets', callback);
			},
			//perform search
			function (collection, callback) {
				collection.find({destinationCode: queryParameters.destination}, 
								{name: 1}, callback);
			},
			//to array
			function (cursor, callback) {
				cursor.toArray(function (error, docs) {
					callback(error, docs);
				})
			}],
			//Callback from waterfall: get the names and put them in an array
			function (error, docs) {
				if (error) {
					var errorToSend = {error:"007-db-access-error", 
						statusCode: 500,
						description: "There was an error when trying to access the database",
						contact: "dlafuente@tuitravel-ad.com"};
					if (debug)
						errorToSend["stack"] = JSON.stringify(error);
					callback(errorToSend);
					return;
				}
				var names = [];
				docs.forEach(function(doc) {
					if (doc.name[queryParameters.language]) {
						names.push(doc.name[queryParameters.language]);
					}
				});
				db.close(true, function(error) {
					callback (error, names);
				});
			}
		);
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

function testEmptyReadTicketNames(callback) {
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

exports.test = function(callback) {
	testing.run({
		testValidReadTicketNames: testValidReadTicketNames,
		testInvalidReadTicketNames: testInvalidReadTicketNames,
		testEmptyReadTicketNames: testEmptyReadTicketNames
	}, callback);
}

 // start tests if invoked directly
if (__filename == process.argv[1]) {
    exports.test(testing.show);
}