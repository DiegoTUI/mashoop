'use strict';
/*
 * TuiInnovation nodejs.
 * JSON Formatter: receives a JSON object and a type map and returns a JSON object with the types fixed
 *
 * Copyright (C) 2013 TuiInnovation.
 */
//requires
require('../util/prototypes.js');
var log = require('../util/log.js');
var core = require('../util/core.js');
var testing = require('testing');

/**
 * The JSON formatter.
 * jsonObject: the JSON object that needs to be formatted
 * typeMap: an array representing the types for the different keys in the JSON object.
 */
exports.JsonFormatter = function(jsonObject, typeMap) {
	// self-reference
	var self = this;

	/**
	 * Formats the JSON object provided with the given type map
	 * retuns a JSON with the types fixed
	 */
	self.formatJson = function() {
		if (typeMap instanceof Array) {
			//Go through the typeMap and fix the types in the jsonObject
			typeMap.forEach(function(typeMapObject) {
				//only processes the element if it's an object with just one key. It wont do anything otherwise.
				if (typeof typeMapObject === 'object' && typeof jsonObject === 'object' && Object.keys(typeMapObject).length == 1) {
					log.debug('formatJson - processing: ' + JSON.stringify(typeMapObject));
					jsonObject = processTypeMapObject(jsonObject, typeMapObject);
				}
			});
		}
		return jsonObject;
	};

	/**
	 * Recursive function to process a type map element on a certain JSON object
	 * Returns JSON object with the type map applied
	 */
	 function processTypeMapObject(jsonObject, typeMapObject) {
		for (var path in typeMapObject) {
			var value = typeMapObject[path];
			if (value instanceof Array) { //we are dealing with a list here
				log.debug('We got an array: ' + JSON.stringify(value));
				var jsonArray = getDeepValueInJson(jsonObject, path);
				log.debug('Array for path: ' + path + ': ' + JSON.stringify(jsonArray));
				if (jsonArray instanceof Array) { //we only do anything if the object contains an array at the specified path
					log.debug('...and the object contained is an array: ' + JSON.stringify(jsonArray));
					var processedJsonArray = processTypeMapArray (jsonArray, value);
					if (processedJsonArray) {
						setDeepValueInJson (jsonObject, path, processedJsonArray);
					}
				}
			} else if (typeof value === 'string') { //this is already a type
				log.debug('We got a string: ' + JSON.stringify(value));
				setDeepValueInJson (jsonObject, path, getTypedValue(value, getDeepValueInJson(jsonObject, path)));
			}
		}
		return jsonObject;
	 }

	 /**
	 * Process a list within the given jsonArray aplying the rules given in the type map array
	 * Returns JSON array with the type map array applied
	 */
	 function processTypeMapArray (jsonArray, typeMapArray) {
		typeMapArray.forEach(function (typeMapElement) {
			if (typeof typeMapElement === 'object') {	//an object in the array
				for (var i=0; i<jsonArray.length; i++) {
					if (typeof jsonArray[i] === 'object') {
						jsonArray[i] = processTypeMapObject (jsonArray[i], typeMapElement);
					}
				}
			} else if (typeof typeMapElement === 'string') { //a string in the array
				for (var j=0; j<jsonArray.length; j++) {
					if (typeof jsonArray[j] === 'string') {
						jsonArray[j] = getTypedValue (typeMapElement, jsonArray[j]);
					}
				}
			}
		});
	 }

	 /**
	 * Changes the type of the value provided to the type provided and returns the result
	 */
	function getTypedValue (type, value) {
		switch (type) {
			case 'int':
				log.debug('parsing int for: ' + value);
				return parseInt(value, 10);
			case 'float':
				log.debug('parsing int for: ' + value);
				return parseFloat(value);
			default:
				log.debug('not parsing for: ' + value);
				return value;
		}
	}

	/**
	 * Explores a json object and return the value specified by path
	 * jsonObject: the JSON object to look in
	 * path: a dot separated string with the path of the desired value
	 */
	function getDeepValueInJson (jsonObject, path) {
		if (typeof path === 'string') {
	        path = path.split('.');
	    }
	    log.debug('getDeepValueInJson: ' + path);
		if (path.length) {
			var key = path.shift();
			if (key in jsonObject) {
				return getDeepValueInJson(jsonObject[key], path);
			}
			else {
				return null;
			}
		} else {
			return jsonObject;
		}
	}

	/**
	 * Explores a json object and sets a value in the given path
	 * If the path does not exist, it won't do anything.
	 * jsonObject: the JSON object to look in
	 * path: a dot separated string with the path of the desired value
	 * value: the value to set
	 */
	function setDeepValueInJson (jsonObject, path, value) {
		if (typeof path === 'string') {
	        path = path.split('.');
	    }
		if (path.length > 1) {
			var key = path.shift();
			if (key in jsonObject) {
				setDeepValueInJson(jsonObject[key], path, value);
			}
		} else {
			jsonObject[path[0]] = value;
		}
	}

	return self;
};

/***********************************
 ************ UNIT TESTS ***********
 ***********************************/
var jsonObject = {
	numbers: ['2', 3, '4', '5'],
	oneFloat: '3.74',
	level1: {
		oneInt: '24',
		level2: [{oneInt: 45,
			oneFloat: '3.4456',
			oneString: '47'
			},
			{oneInt: '54',
			oneFloat: 3.16,
			oneString: '47'
			}
		],
	}
};

var typeMap = [
	{'numbers': ['int']},
	{'oneFloat': 'float'},
	{'level1.oneInt': 'int'},
	{'level1.level2': [{
		'oneInt': 'int',
		'oneFloat': 'float'
	}]}
];


function testFormatJsonObject (callback) {
	var jsonFormatter = new exports.JsonFormatter (jsonObject, typeMap);
	var returnedJson = jsonFormatter.formatJson();
	testing.assert(returnedJson.numbers instanceof Array, 'numbers should be an array in returned JSON',callback);
	testing.assertEquals(returnedJson.numbers.length, jsonObject.numbers.length, 'numbers should be have the same length in both objects',callback);
	for (var i=0; i<returnedJson.numbers.length; i++) {
		var number = returnedJson.numbers[i];
		testing.assert(core.isInteger(number), 'all numbers in array numbers should be integers ', callback);
		testing.assert(number === parseInt(jsonObject.numbers[i],10), 'all numbers in array numbers should be the same as in the original object', callback);
	}
	testing.assert(core.isFloat(returnedJson.oneFloat), 'oneFloat should be a float', callback);
	testing.assert(core.isInteger(returnedJson.level1.oneInt), 'level1.oneInt should be an int', callback);
	testing.assert(returnedJson.level1.oneInt === parseInt(jsonObject.level1.oneInt, 10), 'level1.oneInt should be the same as in the original object', callback);
	var level2 = jsonObject.level1.level2;
	var returnedLevel2 = returnedJson.level1.level2;
	testing.assert(returnedLevel2 instanceof Array, 'level 2 should be an array in returned JSON',callback);
	testing.assertEquals(returnedLevel2.length, level2.length, 'level2 should be have the same length in both objects',callback);
	for (var j=0; j<returnedLevel2.length; j++) {
		testing.assert(core.isInteger(returnedLevel2[j].oneInt), 'level2-oneInt should be an integer', callback);
		testing.assert(core.isFloat(returnedLevel2[j].oneFloat), 'level2-oneFloat should be a float', callback);
		testing.assert(core.isString(returnedLevel2[j].oneString), 'level2-oneString should be a string', callback);
		testing.assert(returnedLevel2[j].oneInt === level2[j].oneInt, 'level2-oneInt should be the same in both objects',callback);
	}
	testing.success(callback);
}

 exports.test = function(callback) {
	testing.run({
		testFormatJsonObject: testFormatJsonObject
	}, callback);
};

 // start tests if invoked directly
if (__filename == process.argv[1]) {
    exports.test(testing.show);
}

