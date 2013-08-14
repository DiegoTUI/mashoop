'use strict';

//requires
require('./util/core.js');
var fs = require('fs');
var path = require('path');
var log = require('./util/log.js');
var config = require('./config.js');
var express = require('express');
var testing = require('testing');
//globals
var services = {};
//constants
process.title = 'mashoop';
//uncaught exceptions
process.on('uncaughtException', function(err) {
	log.error("We found an uncaught exception.");
	log.error(err.stack);
	process.exit(0);
});
//exit events
process.on('SIGINT', function() {
	log.info("Received SIGINT signal");
	process.exit(1);
});
process.on('SIGTERM', function() {
	log.info("Received SIGTERM signal");
	process.exit(2);
});
 
process.on('exit', function(code) {
	log.info("About to exit with code: " + code);
});

 /**
 * Start server
 */
exports.startServer = function() {
	services = readServices();
	var app = express();
	app.get("/api/:service", serve);
	app.listen(config.expressPort);
}

/**
 * Services reader
 */
function readServices() {
 	var services = fs.readdirSync(path.resolve(__dirname, "services"));
 	//remove "config", ".DS_Store"
 	services = services.filter(function(element) {
 		if ((element === 'config')||(element[0] === '.'))
 			return false;
 		return true;
 	});
 	//produce the result
 	var result = {};
 	services.forEach(function(service) {
 		var key = service.split(".")[0];
 		var servifiedKey = key.servify();
 		var baseService = require("./services/" + service);
 		if (servifiedKey in baseService) {
 			result[key] = baseService[servifiedKey];
 			log.info("Read service: " + key);
 		}
 		else
 			log.error("Couldn't read service: " + key);
 	});
 	return result;
 }

/**
 * HTTP server
 */
function serve (request, response) {
	//service callback
	function serviceCallback(error, result) {
		if (error) {
			response.status(error.statusCode).send(JSON.stringify(error));
			return;
		}
		response.set("Content-Type", "text/plain");
		result = typeof result === "string" ? result : JSON.stringify(result);
		response.send(result);
	}
	// perform request to the requested service
	var service = request.params.service;
	if (!(service in services) {
		log.info("service " + request.params.service + " not found");
		return serviceCallback({
			error: "001-service-not-found",
			statusCode: 404,
			description: "The requested service " + service + " was not found in this server",
			contact:"dlafuente@tuitravel-ad.com"
		});
	}
	var theRequest = new services[service](request.query);
	theRequest.sendRequest(serviceCallback);
}

/***********************************
 ************ UNIT TESTS ***********
 ***********************************/
function testReadServices (callback) {
	var services = fs.readdirSync(path.resolve(__dirname, "services"));
	services = services.filter(function(element) {
 		if ((element === 'config')||(element[0] === '.'))
 			return false;
 		return true;
 	});
	var servicesRead = readServices();
	testing.assertEquals(Object.keys(servicesRead).length, services.length, "incorrect number of services retrieved by readServices", callback);
	for (var service in servicesRead) {
		testing.assert(services.indexOf(service + '.js') > -1, "service " + service + " was not read at all", callback);
		testing.assert(servicesRead[service] != undefined, "service " + service + " was not properly read", callback);
	}
	testing.success(callback);
}

exports.test = function(callback) {
    testing.run({
        testReadServices: testReadServices
    }, callback);
}

/**
 * Start server.
 * In this case tests are not run when invoking the file; use test.js for that.
 */
if (__filename == process.argv[1]) {
	exports.startServer();
}

