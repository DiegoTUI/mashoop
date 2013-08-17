/*
 * TuiInnovation database class.
 * Connect to MongoDB, return a collection.
 *
 * Copyright (C) 2013 TuiInnovation.
 */

// requires
var MongoClient = require('mongodb').MongoClient;
var config = require('../config.js');
var log = require('./log.js');
var testing = require('testing');

// globals
var db = null;
var callbacks = [];

// init
connect();


/**
 * Connect to the database.
 */
function connect() {
	var connection = config.mongoConnection;
	MongoClient.connect(config.mongoConnection, {w: 1}, function(error, result) {
		if (config.mongoConnection != connection) {
			// connection string changed on the fly; ignore
			log.info('Discarding open connection to %s', connection);
			return;
		}
		if (error) {
			log.error('Could not connect to MongoDB: %s', error);
		} else {
			db = result;
		}
		callbacks.forEach(function(fn) {
			fn(error, db);
		});
	});
}

/**
 * Add a new callback for database online.
 */
exports.addCallback = function(callback) {
	if (db) {
		// already here
		return callback(null, db);
	}
	callbacks.push(callback);
}

/**
 * Reconnect to the database, possibly with different paramters.
 */
exports.reconnect = function(callback) {
	if (callback) {
		callbacks.push(callback);
	}
	if (!db) {
		return connect();
	}
	db.close(function(error, result) {
		connect();
	});
}

/**
 * Get a collection.
 */
exports.getCollection = function(name) {
	if (!db) {
		return null;
	}
	return db.collection(name);
}

/**
 * Get the test collection.
 */
function testCollection(callback) {
	addCallback(function(error, result) {
		testing.check(error, 'Could not start database', callback);
		var test = exports.getCollection('test');
		testing.assert(test, 'Empty test collection', callback);
		test.count(function(error, count) {
			testing.check(error, 'Could not get test count');
			testing.success(callback);
		});
	});
}

/**
 * Run all tests.
 */
exports.test = function(callback) {
	testing.run({
		collection: testCollection,
	}, callback);
}

// start tests if invoked directly
if (__filename == process.argv[1]) {
	exports.test(testing.show);
}
