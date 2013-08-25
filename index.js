'use strict';

/**
 * Start in cluster mode.
 * Adapted from http://www.godtic.com/blog/2013/07/27/modo-cluster-para-node-js/
 * (C) 2013 TuiInnovation.
 */

// requires
var app = require("./lib/app.js");
var log = require('./lib/util/log.js');

// init
app.startServer(function() {
	log.info('Listening in single process mode');
});

