'use strict';

/**
 * Requirements.
 */
var fs = require('fs');
var path = require('path');
var express = require('express');
var services = require('./services/services.js');
var log = require('./util/log.js');

/**
 * Constants.
 */
process.title = 'tuiMashup';
/**
 * Process uncaught exceptions.
 */
 process.on('uncaughtException', function(err) {
	log.error("We found an uncaught exception.");
	log.error(err.stack);
});

/**
 * Globals.
 */
var config = JSON.parse(fs.readFileSync(path.resolve(__dirname, "config.json")));
//The app
var app = express();
//Serve root GET calls
app.get("/:service", serve);
//Listen
app.listen(config.port);
log.info("listening on port: " + config.port);

/**
 * HTTP server
 */
function serve (request, response) {
	log.info("Serving for " + request.params.service + " with query: " + JSON.stringify(request.query));
	//ok and nok callbacks
	function ok(body) {
		response.set("Content-Type", "text/plain");
		body = typeof body === "string" ? body : JSON.stringify(body);
		response.send(body);
	}
	function nok(result) {
		//response.set("Content-Type", "text/html");
		response.status(result.statusCode).send(JSON.stringify(result.error));
	}
	//perform request to the required service
	if (typeof services[request.params.service] === 'function') {
		var theRequest = new services[request.params.service](request.query);
		theRequest.sendRequest(ok, nok);
	} else {
		log.info("service " + request.params.service + " not found");
		nok({error:{errorDetail:"service not found"}, statusCode:404});
	}
}
