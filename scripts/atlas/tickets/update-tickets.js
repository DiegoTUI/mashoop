'use strict';
/**
 * Script to query ATLAS about tickets in certain destinations 
 * and update collection tickets in tuiinnovation db.
 * Usage: node update-ticket.js [destination_code]
 */

/**
 * Requirements.
 */
var TicketAvailParser = require("./ticket-avail-parser.js").TicketAvailParser;
var fs = require('fs');
var path = require('path');
var log = require('../../../lib/util/log.js');
var core = require('../../../lib/util/core.js');
var async = require('async');

//constants
process.title = 'update-tickets';
//process uncaught exceptions.
process.on('uncaughtException', function(err) {
	log.error("We found an uncaught exception.");
	log.error(err.stack);
});
//script starts here
var languages = JSON.parse(fs.readFileSync(path.resolve(__dirname, "languages.json")));
var destinations = JSON.parse(fs.readFileSync(path.resolve(__dirname, "destinations.json")));
var queryParameters = {
 	PaginationData_itemsPerPage: "2000"
};
//set the dates
var date = new Date();
queryParameters["DateFrom_date"] = core.atlasDate(date); 
date.setDate(date.getDate() + 7);
queryParameters["DateTo_date"] = core.atlasDate(date); 
//Build the stream
var stream = {};
destinations.forEach(function(destination) {
	languages.forEach(function(language) {
		stream[destination + "." + language] = function (callback) {
			queryParameters["Language"] = language;
			queryParameters["Destination_code"] = destination;
			var ticketAvailParser = new TicketAvailParser (queryParameters);
			ticketAvailParser.parseTickets(callback);
		};
	});
});
//parse the tickets in parallel
async.parallel (stream, function(error, results) {
	if (error) {
		log.error ("Update tickets produced an error: " + JSON.stringify(error));
		process.exit(1);
	}
	for (var key in results) {
		log.info("Parsed tickets in " + key + " - Mongo: " + results[key]);
	}
	process.exit(0);
});
