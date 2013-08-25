'use strict';

/**
 * Start in cluster mode.
 * Adapted from http://www.godtic.com/blog/2013/07/27/modo-cluster-para-node-js/
 * (C) 2013 TuiInnovation.
 */

// requires
var cluster = require('cluster');
var app = require('./lib/app.js');
var log = require('./lib/util/log.js');

// globals
var numCPUs = require('os').cpus().length;

// init
if (cluster.isMaster) {
	// create one worker per CPU
	for (var i = 0; i < numCPUs; i++) {
		cluster.fork();
	}
	cluster.on('exit', function(worker, code, signal) {
		log.info('worker ' + worker.process.pid + ' died');
		cluster.fork();
	});
}
else {
	// start the server
	app.startServer(function() {
		log.info('Worker ' + cluster.worker.id + ' / ' + numCPUs + ' listening');
	});
}

