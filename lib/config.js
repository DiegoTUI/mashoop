'use strict';

// requires
var Log = require('log');

// globals
var log = new Log('info');

/**
 * Exports
 */

// parameters for express server
exports.expressHost = "127.0.0.1";
exports.expressPort = 8080;

// check API keys
exports.checkApiKeys = true;
// whether to cache ticket results
exports.ticketCacheResults = true;

try {
	var localConfig = require('../local-config.js');
	for (var key in localConfig) {
		exports[key] = localConfig[key];
	}
} catch(exception) {
	log.notice('local-config.js not found');
}

