'use strict';

// requires
var Log = require('log');

// globals
var log = new Log('info');

/**
 * Exports
 */

// parameters for express server
exports.expressHost = '127.0.0.1';
exports.expressPort = 8080;

// Cross domain resource sharing
exports.CORSEnabled = true;

// parameters for MongoDB
exports.mongoConnection = 'mongodb://127.0.0.1:27017/mashoop';

// various token lengths
exports.echoTokenLength = 8;
exports.sessionIdLength = 8;
exports.mongoIdLength = 12;

// content type returned by the server
exports.contentType = 'application/json';
exports.accessControlAllowOrigin = '*';
exports.accessControlAllowHeaders = 'X-Titanium-Id';
exports.accessControlAllowMethods = 'GET';

// check API keys
exports.checkApiKeys = true;
// whether to cache ticket results
exports.ticketCacheResults = true;
//log-level. Could be debug, info, notice, warning, error, critical, alert or emergency
exports.logLevel = 'info';

try {
	var localConfig = require('../local-config.js');
	for (var key in localConfig) {
		exports[key] = localConfig[key];
	}
} catch(exception) {
	log.notice('local-config.js not found');
}

