'use strict';

/**
 * Start in single process mode mode.
 * (C) 2013 TuiInnovation.
 */

// requires
var app = require('./lib/app.js');
var log = require('./lib/util/log.js');

// init
app.startServer(function() {
	log.info('Listening in single process mode');
});

