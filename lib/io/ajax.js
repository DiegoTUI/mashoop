'use strict';
/*
 * TuiInnovation nodejs.
 * Ajax async calls.
 *
 * Copyright (C) 2013 TuiInnovation.
 */

//requires
 var log = require('../util/log.js');
 var request = require('request');
 var testing = require('testing');

/**
 * object to encapsulate Ajax globals and functions.
 */
var Ajax = function() {
	// self-reference
	var self = this;

	/**
	 * Function to submit data using Ajax, with instrumentation.
	 * The options parameter should contain (see https://github.com/mikeal/request):
	 *    - url: the only mandatory field
	 *    - form: the data that you want to send to the server (could be an key-value object)
	 *    - method: POST or GET. Default is GET
	 *    - headers: http headers. Defaults to {}
	 *    - debug: boolean to indicate if debug mode is on
	 * callback follows the function(error, result) nodejs convention
	 */
	self.send = function(options, callback) {
		if (!('url' in options)) {	//checking for the only compulsory field
			log.debug('About to send no-url error.');
			callback({error: '000-missing-url',
					statusCode: 0,
					description: 'You called ajax.send() with no url. This makes no sense. Look at the options you sent: ' + JSON.stringify(options),
					contact: 'dlafuente@tuitravel-ad.com'});
			return;
		}
		request (options, processResponse);
		function processResponse(error, httpResponse, body) {
			var errorToSend = null;
			if (error) { //there was an error
				log.debug('Error for url ' + options.url + ': ' + JSON.stringify(error));
				errorToSend = {error:'002-connection-error',
						statusCode:502,
						description:'Connection error when trying to reach ' + options.url,
						contact: 'dlafuente@tuitravel-ad.com'};
				if (options.debug)
					errorToSend.stack = JSON.stringify(error);
				callback(errorToSend);
			} else { //No error, let's look at the statusCode
				log.debug ('received response from server: ' + httpResponse.statusCode);
				if (httpResponse.statusCode != 200) {
					errorToSend = {
						error: '006-service-error',
						statusCode: httpResponse.statusCode,
						description: 'The service we are trying to reach at ' + options.url + ' returned a status code different from 200',
						contact: 'dlafuente@tuitravel-ad.com'
					};
					if (options.debug)
						errorToSend.stack = JSON.stringify(body);
					callback(errorToSend);
				} else {
					//Response OK. Different classes should check if the error is coded in the response
					log.debug ('sending OK response');
					callback(null, body);
				}
			}
		}
	};

	return self;
};

exports.ajax = new Ajax ();

/***********************************
 ************ UNIT TESTS ***********
 ***********************************/
 function testEmptyUrl (callback) {
	function ajaxCallback (error/*, result*/) {
		testing.assert(error !== null, 'No url in options should return an error', callback);
		testing.assertEquals(error.error, '000-missing-url', 'The error returned does not have a proper error body', callback);
		testing.success(callback);
	}
	var options = {};
	exports.ajax.send(options, ajaxCallback);
 }

 function testAtlasError (callback) {
	function ajaxCallback (error/*, result*/) {
		testing.assert(error !== null, 'GET call to ATLAS should return an error', callback);
		testing.assertEquals(error.error, '002-connection-error', 'The error returned does not have an error body', callback);
		testing.assert(error.stack !== null, 'Connection error did not return a stack while in debug mode', callback);
		testing.success(callback);
	}
	var options = {
		url: 'http://212.170.239.72/appservices/http/FrontendService',
		debug: true
	};
	exports.ajax.send(options, ajaxCallback);
 }

 function testUnexistingSite (callback) {
	function ajaxCallback (error/*, result*/) {
		testing.assert(error !== null, 'Call to unexisting site should return an error', callback);
		testing.assertEquals(error.error, '002-connection-error', 'The error returned does not have an error body', callback);
		testing.assert(error.stack !== null, 'Connection error did not return a stack while in debug mode', callback);
		testing.success(callback);
	}
	var options = {
		url: 'http://thiscrap.doesnotexist.nkk/unexisting.html',
		debug: true
	};
	exports.ajax.send(options, ajaxCallback);
 }

exports.test = function(callback) {
	testing.run({
		testEmptyUrl: testEmptyUrl,
		testAtlasError: testAtlasError,
		testUnexistingSite: testUnexistingSite
	}, 100000, callback);
};

 // start tests if invoked directly
if (__filename == process.argv[1]) {
    exports.test(testing.show);
}