'use strict';
/**
 * Script to query ATLAS about hotels in certain destinations 
 * and update collection hotels in tuiinnovation db.
 * Usage: node update-hotels.js [destination_code]
 */

/**
 * Requirements.
 */
var HotelParser = require('./hotel-parser.js').HotelParser;
var fs = require('fs');
var path = require('path');
var Log = require('log');
var log = new Log();
var core = require('../util/core.js');
var async = require('async');

//constants
process.title = 'update-hotelss';
//process uncaught exceptions.
process.on('uncaughtException', function(err) {
	log.error('We found an uncaught exception.');
	log.error(err.stack);
});
//script starts here
var languages = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'languages.json')));
var destinations = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'destinations.json')));
//Build the stream
var stream = {};
destinations.forEach(function(destination) {
	languages.forEach(function(language) {
		stream[destination + '.' + language] = function (callback) {
			var queryParameters = {};
			queryParameters.language = language;
			queryParameters.destination = destination;
			queryParameters.debug = true;
			var hotelParser = new HotelParser (queryParameters);
			hotelParser.parseItems(callback);
		};
	});
});
//parse the tickets in parallel
async.parallel (stream, function(error, results) {
	if (error) {
		log.error ('Update hotels produced an error: ' + JSON.stringify(error));
		process.exit(1);
	}
	for (var key in results) {
		log.debug('Parsed hotels in ' + key + ' - Mongo: ' + results[key]);
	}
	process.exit(0);
});
