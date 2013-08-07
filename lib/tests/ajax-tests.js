'use strict';
/**
 * TuiInnovation
 * Ajax unit tests
 *
 * Copyright (C) 2013 TuiInnovation.
 */


/* run tests */
var ajax = require('../io/ajax.js').ajax;
var log = require('../util/log.js');

exports.testOffline = function (test) {
	test.expect(2);
	function ajaxCallback (error, result) {
 		test.ok(error != null, "No url in options should return an error");
 		test.ok(error.error != null, "The error returned does not have an error body");
 		test.done();
 	}
 	var options = {
 		url: "http://212.170.239.72/appservices/http/FrontendService"
 	};
 	ajax.send(options, ajaxCallback);
}

exports.testEmptyUrl = function(test) {
	test.expect(2);
 	function ajaxCallback (error, result) {
 		log.info("Entering ajaxCallback");
 		test.ok(error != null, "No url in options should return an error");
 		test.ok(error.error === "MISSING_URL_FIELD", "The error returned does not have a proper error body");
 		test.done();
 	}
 	var options = {};
 	ajax.send(options, ajaxCallback);
 }

 exports.testFOAASCall = function (test) {
 	test.expect(3);
 	function ajaxCallback (error, result) {
 		log.info ("FOAAS returned: " + result);
 		result = JSON.parse(result);
 		test.ok(error === null, "Proper call to FOAAS should not return an error");
 		test.ok(result.message === "Fuck off, Tom.", "Wrong message returned by FOAAS");
 		test.ok(result.subtitle === "- Chris", "Wrong subtitle returned by FOAAS");
 		test.done();
 	}
 	var options = {
 		url: "http://foaas.com/off/Tom/Chris",
 		headers: {Accept: "application/json"}
 	};
 	ajax.send(options, ajaxCallback);
 }

