'use strict';
/*
 * TuiInnovation nodejs.
 * Ajax async calls.
 *
 * Copyright (C) 2013 TuiInnovation.
 */

 var log = require('../util/log.js');

/**
 * object to encapsulate Ajax globals and functions.
 */
var ajax = new function()
{
	// self-reference
	var self = this;

	//requires
	var request = require('request');

	/**
	 * Function to submit data using Ajax, with instrumentation.
	 * The options parameter should contain (see https://github.com/mikeal/request):
	 *    - url: the only mandatory field
	 *    - form: the data that you want to send to the server (could be an key-value object)
	 *    - method: POST or GET. Default is GET
	 *    - headers: http headers. Defaults to {}
	 * callback follows the function(error, result) nodejs convention
	 */
	self.send = function(options, callback)
	{
		if (!("url" in options)) {	//checking for the only compulsory field
			log.info("About to send no-url error.");
			callback({error: "MISSING_URL_FIELD"});
			return;
		}
		request (options, processResponse);
		function processResponse(error, httpResponse, body) {
			if (error) { //there was an error
				//log.info("Error for url " + options.url + ": " + JSON.stringify(error));
				callback({error:error, statusCode:500});
			} else { //No error, let's look at the statusCode
				log.info ("received response from server: " + httpResponse.statusCode);
				if (httpResponse.statusCode != 200) {
					callback({error:body, statusCode:httpResponse.statusCode});
				} else {
					//Response OK. Different classes should check if the error is coded in the response
					log.info ("sending OK response");
					callback(null, body);
				}
			}
		}
	}

}

exports.ajax = ajax;

/***********************************
 ************ UNIT TESTS ***********
 ***********************************/
 var testing = require('testing');

 function testEmptyUrl (callback) {
 	function ajaxCallback (error, result) {
 		testing.assert(error != null, "No url in options should return an error", callback);
 		testing.assertEquals(error.error, "MISSING_URL_FIELD", "The error returned does not have a proper error body", callback);
 		testing.success(callback);
 	}
 	var options = {};
 	ajax.send(options, ajaxCallback);
 }

 function testOffline (callback) {
 	function ajaxCallback (error, result) {
 		testing.assert(error != null, "GET call to ATLAS should return an error", callback);
 		testing.assert(error.error != null, "The error returned does not have an error body", callback);
 		testing.success(callback);
 	}
 	var options = {
 		url: "http://212.170.239.72/appservices/http/FrontendService"
 	};
 	ajax.send(options, ajaxCallback);
 }

 function testFOAASCall (callback) {
 	function ajaxCallback (error, result) {
 		log.info ("FOAAS returned: " + result);
 		result = JSON.parse(result);
 		testing.assertEquals(error, null, "Proper call to FOAAS should not return an error", callback);
 		testing.assertEquals(result.message, "Fuck off, Tom.", "Wrong message returned by FOAAS", callback);
 		testing.assertEquals(result.subtitle, "- Chris", "Wrong subtitle returned by FOAAS", callback);
 		testing.success(callback);
 	}
 	var options = {
 		url: "http://foaas.com/off/Tom/Chris",
 		headers: {Accept: "application/json"}
 	};
 	ajax.send(options, ajaxCallback);
 }

exports.test = function(callback) {
	testing.run({
		testEmptyUrl: testEmptyUrl,
		testOffline: testOffline,
		testFOAASCall: testFOAASCall
	}, 100000, callback);
}

 // start tests if invoked directly
if (__filename == process.argv[1])
{
    exports.test(testing.show);
}