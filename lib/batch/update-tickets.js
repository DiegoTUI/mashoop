'use strict';
/**
 * Script to query ATLAS about tickets in certain destinations 
 * and update collection tickets in tuiinnovation db.
 * Usage: node update-tickets.js [destination_code]
 */

/**
 * Requirements.
 */
var TicketAvailParser = require('./ticket-avail-parser.js').TicketAvailParser;
var fs = require('fs');
var path = require('path');
var Log = require('log');
var log = new Log();
var core = require('../util/core.js');
var async = require('async');

//constants
process.title = 'update-tickets';
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
			var queryParameters = {
				pagesize: '2000'
			};
			//set the dates
			var date = new Date();
			queryParameters.from = core.atlasDate(date);
			date.setDate(date.getDate() + 7);
			queryParameters.to = core.atlasDate(date);
			queryParameters.language = language;
			queryParameters.destination = destination;
			queryParameters.debug = true;
			var ticketAvailParser = new TicketAvailParser (queryParameters);
			ticketAvailParser.parseItems(callback);
		};
	});
});
//parse the tickets in parallel
async.parallel (stream, function(error, results) {
	if (error) {
		log.error ('Update tickets produced an error: ' + JSON.stringify(error));
		process.exit(1);
	}
	for (var key in results) {
		log.debug('Parsed tickets in ' + key + ' - Mongo: ' + results[key]);
	}
	process.exit(0);
});
