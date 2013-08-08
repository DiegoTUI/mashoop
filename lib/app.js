'use strict';

/**
 * Globals
 */
require('./util/core.js');
var fs = require('fs');
var path = require('path');
var log = require('./util/log.js');
var cluster = require('cluster');
var services = readServices();

/**
 * Constants.
 */
process.title = 'mashoop';
/**
 * Process uncaught exceptions.
 */
 process.on('uncaughtException', function(err) {
	log.error("We found an uncaught exception.");
	log.error(err.stack);
	process.exit(0);
});
 /**
 * Process exit events.
 */
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
function startServer() {
	var express = require('express');
	if (cluster.isMaster){	//master process
		var cpuCount = require('os').cpus().length;
		for (var i = 0; i < cpuCount; i++) {
			cluster.fork();
		}
	} else {	//worker process
		var config = JSON.parse(fs.readFileSync(path.resolve(__dirname, "config.json")));
		var app = express();
		app.get("/:service", serve);
		app.listen(config.port);
		log.info("worker " + cluster.worker.id + " listening on port: " + config.port);
	}
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
	log.info("Worker " + cluster.worker.id + " serving for " + request.params.service + " with query: " + JSON.stringify(request.query));
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
	//perform request to the required service
	if (typeof services[request.params.service] === 'function') {
		var theRequest = new services[request.params.service](request.query);
		theRequest.sendRequest(serviceCallback);
	} else {
		log.info("service " + request.params.service + " not found");
		serviceCallback({error:"001-service-not-found",
						statusCode:404,
						description:"The service requested in http://servername/:service was not found in this server",
						contact:"dlafuente@tuitravel-ad.com"});
	}
}

/***********************************
 ************ UNIT TESTS ***********
 ***********************************/
var testing = require('testing');

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
 * Start server or run tests
 * Server is only started if called from index.js
 */
// start tests if invoked directly
if (__filename == process.argv[1])
{
    exports.test(testing.show);
} else if (process.argv[1].endsWith("index.js")){ //start server only if called from index.js
	startServer();
}

