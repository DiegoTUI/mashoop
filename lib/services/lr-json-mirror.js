'use strict';
/*
 * TuiInnovation nodejs.
 * LRJsonMirror: returns a JSON containing your query string 
 * Implementedto test AFJSONRequestOperation in the Laterooms app
 *
 * Copyright (C) 2013 TuiInnovation.
 */
//requires
var log = require('../util/log.js');
var testing = require('testing');

/**
 * The LRJsonMirror request.
 * queryParameters: the parameters to perform the call
 */
exports.LRJsonMirror = function(queryParameters) {
	// self-reference
	var self = this;
	//debug mode
	var debug = ("debug" in queryParameters);
	/**
	 * Produces a JSON with the query parameters and returns it
	 */
	self.sendRequest = function(callback) {
		callback(null, {
			destination: "BCN",
			language : "CAS",
			debug: 500, 
			array: ["uno", 2, 5.67, "tres"]
		});
	}

	return self;
}
/***********************************
 ************ UNIT TESTS ***********
 ***********************************/
function testMixedCall(callback) {
	function fsCallback (error, result) {
		testing.assert(error === null, "Valid request to lrJsonMirror returned an error: " + JSON.stringify(error), callback);
		testing.assertEquals(result.string, parameters.string, "Invalid response");
		testing.assertEquals(result.number, parameters.number, "Invalid response");
		testing.assertEquals(result.array.length, parameters.array.length, "Invalid response");
		testing.assertEquals(result.array[0], parameters.array[0], "Invalid response");
		testing.assertEquals(result.array[1], parameters.array[1], "Invalid response");
		testing.assertEquals(result.array[2], parameters.array[2], "Invalid response");
		testing.assertEquals(result.object.elem1, parameters.object.elem1, "Invalid response");
		testing.assertEquals(result.object.elem2, parameters.object.elem2, "Invalid response");
		testing.success(callback);
	}
	var parameters = {
		string: "A string",
		array: ["elem1", "elem2", "elem3"],
		number: 500,
		object: {elem1: "elem1", elem2: "elem2"}
	};

	var lrJsonMirror = new exports.LRJsonMirror(parameters);
	lrJsonMirror.sendRequest(fsCallback);
}

exports.test = function(callback) {
	testing.run({
		testMixedCall: testMixedCall
	}, callback);
}

 // start tests if invoked directly
if (__filename == process.argv[1]) {
    exports.test(testing.show);
}
