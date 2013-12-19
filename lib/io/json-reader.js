'use strict';
/*
 * TuiInnovation nodejs.
 * JSON Reader: receives an json object properly formatted and returns an ATLAS-compliant xml string
 *
 * Copyright (C) 2013 TuiInnovation.
 */
//requires
require('../util/prototypes.js');
var log = require('../util/log.js');
var xml2js = require('xml2js');
var core = require('../util/core.js');
var testing = require('testing');

/**
 * The JSON reader.
 * jsonObject: the properly formatted JSON object to be transformed in an XML
 */
exports.JsonReader = function(jsonObject) {
	// self-reference
	var self = this;
	// xml string
	var xmlString = null;
	/**
	 * Reads the properly formatted JSON object and produces the desired XML
	 * callback: a function(error, result) returning an error or a JSON with the parsed objects
	 */
	self.produceXML = function(callback) {
		//initialize xml string
		xmlString = '';
		//iterate the json object
		for (var key in jsonObject) {
			var chunkToAppend = processNode(key, jsonObject[key]);
			//check for errors first
			if (typeof chunkToAppend !== 'string') {
				//an error occured, return and call back
				return callback (chunkToAppend, null);
			}
			//no errors, append
			xmlString = xmlString + chunkToAppend;
		}
		//call back
		callback (null, xmlString);
	};

	/**
	 * Recursive function to process nodes in a properly formatted JSON
	 * Returns null if the any error occurs (JSON badly formatted, mainly)
	 */
	 function processNode(key, value) {
		var result = '';
		// no-key lists
		if (key === '#list') {
			return processList(key, value);
		}
		// "regular" node
		result = result + '<' + key;
		// string or number value
		if (typeof value === 'string' || typeof value === 'number') {
			result = result + '>' + value;
		}
		// keyed list
		else if (value instanceof Array) {
			var list = processList (key, value);
			// check if processList returned an error
			if (list instanceof Object) {
				return list;
			}
			// no error, go on
			result = result + '>' + list; 
		}
		// dictionary
		else if (value instanceof Object) {
			var dictionary = processDictionary (value);
			// check if processDictionary returned an error
			if (dictionary instanceof Object) {
				return dictionary;
			}
			// no error, go on
			result = result + processDictionary (value);
		}
		// close tag
		result = result + '</' + key + '>\n';
		// return result
		return result;
	 }

	/**
	 * Process a list in the json object. Returns a string if everything goes right.
	 * Returns an object if an error occurs
	 */
	function processList(key, list) {
		// init result
		var result = '';
		//check that the list is an actual array
		if (!(list instanceof Array)) {
			// return an error
			var errorToSend = {
				error: '101-bad-json-to-xml',
				statusCode: -1900,
				description: 'The json provided is not properly formatted. The list with key ' + key + ' is not an array.',
				contact: 'dlafuente@tuitravel-ad.com'
			};
			return errorToSend;
		}
		// process the list
		list.forEach(function(item) {
			// each item should be a dictionary
			if (!(item instanceof Object)) {
				// return an error
				var errorToSend = {
					error: '101-bad-json-to-xml',
					statusCode: -1900,
					description: 'The json provided is not properly formatted. There are items in list' + key + ' that are not objects.',
					contact: 'dlafuente@tuitravel-ad.com'
				};
				return errorToSend;
			}
			// process item
			for (var innerKey in item) {
				var innerList = item[innerKey];
				//check that the inner list is an actual array
				if (!(innerList instanceof Array)) {
					// return an error
					var errorToSend = {
						error: '101-bad-json-to-xml',
						statusCode: -1900,
						description: 'The json provided is not properly formatted. The inner list with key ' + innerKey + ' is not an array.',
						contact: 'dlafuente@tuitravel-ad.com'
					};
					return errorToSend;
				}
				// process item in inner list
				innerList.forEach(function(innerItem) {
					// each innerItem should be a dictionary
					if (!(innerItem instanceof Object)) {
						// return an error
						var errorToSend = {
							error: '101-bad-json-to-xml',
							statusCode: -1900,
							description: 'The json provided is not properly formatted. There are items in list' + innerKey + ' that are not objects.',
							contact: 'dlafuente@tuitravel-ad.com'
						};
						return errorToSend;
					}
					// go for it!!
					result = result + processNode(innerKey, innerItem);
				});
			}
		});
		// if we got this far, then we have to return something
		return result;
	}

	/**
	 * Process a dictionary in the json object. Returns a string if everything goes right.
	 * Returns an object if an error occurs
	 */
	function processDictionary(dictionary) {
		// init response
		var result = '';
		// get all keys of dictionary
		var keys = Object.keys(dictionary);
		// the keys starting with '@'
		var attributes = {};
		// the value of the '#value' key
		var textValue = null;
		// any other value
		var other = {};
		// browse the keys and fill the attributes, textValue and others
		keys.forEach(function(key) {
			// attributes
			if (key.startsWith('@')) {
				attributes[key.substringFrom('@')] = dictionary[key];
			}
			// test value
			else if (key === '#value') {
				textValue = dictionary['#value'];
			}
			// other
			else {
				other[key] = dictionary[key];
			}
		});
		// Add attributes first
		for (var key in attributes) {
			// check for errors
			if (typeof attributes[key] !== 'string' && typeof attributes[key] !== 'number') {
				// return an error
				var errorToSend = {
					error: '101-bad-json-to-xml',
					statusCode: -1900,
					description: 'The json provided is not properly formatted. The attribute @' + key + ' is not a string.',
					contact: 'dlafuente@tuitravel-ad.com'
				};
				return errorToSend;
			}
			// no errors, go on
			result = result + ' ' + key + '="' + attributes[key] + '"';
		}
		// close tag
		result = result + '>\n';
		// add text value
		if (textValue) {
			result = result + textValue;
		}
		// process the other nodes
		for (var key in other) {
			result = result + processNode(key, other[key]);
		}
		// we got this far, return something
		return result;
	}

	return self;
};

/***********************************
 ************ UNIT TESTS ***********
 ***********************************/
 /*jshint multistr: true */
var ticketValuationObject = {
	'TicketValuationRQ':{
		'@echoToken': 'DummyEchoToken',
		'@xmlns': 'http://www.hotelbeds.com/schemas/2005/06/messages',
		'@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
		'@xsi:schemaLocation': 'http://www.hotelbeds.com/schemas/2005/06/messages TicketValuationRQ.xsd',
		'Language': 'ENG',
		'Credentials': {
			'User': 'ISLAS',
			'Password': 'ISLAS'
		},
		'Destination': {
			'@code':'PMI',
			'@type':'SIMPLE',
			'Name':'Palma',
			'#value':'CRAP'
		},
		'GuestList': [{
			'Customer': [{
				'@type': 'AD',
				'Age': 45,
				'Name': 'testName',
				'Document': {
					'@docType': 'testType',
					'DocHolderName': 'testName'
					}
				},
				{
				'@type': 3,
				'Age': 54,
				'Name': 'testName',
				'Document': {
					'@docType': 'testType',
					'DocHolderName': 'testName'
					}
				}
			]}
		],
		'#list':[{'Classification': [{'@code': 'Code1',
										'#value': 'Class1'},
									{'@code': 'Code2',
										'#value': 'Class2'}
									]
				}]
	}
};


function testValidJson (callback) {
	var jsonReader = new exports.JsonReader (ticketValuationObject);
	jsonReader.produceXML(function (error, xmlString) {
		testing.assert(error === null, 'valid JSON should not return an error', callback);
		for (var key in ticketValuationObject) {
			checkNode (key, ticketValuationObject[key], xmlString, callback);
		}
		testing.success(callback);
	});
}

function checkNode (key, value, xmlString, callback) {
	// attribute
	if (key.startsWith('@')) {
		testing.assert(xmlString.contains(key.substringFrom('@')), 'didnt find attribute ' + key + ' in xml.', callback);
	}
	// #value
	else if (key === '#value') {
		testing.assert(xmlString.contains(value), 'didnt find #value ' + value + ' in xml.', callback);
	}
	// #list
	else if (key === '#list') {
		value.forEach(function(item) {
			for (var innerKey in item) {
				checkNode (innerKey, item, xmlString, callback);
			}
		});
	}
	// rest of keys
	else {
		testing.assert(xmlString.contains('<' + key), 'didnt find opening key ' + key + ' in xml.', callback);
		testing.assert(xmlString.contains('</' + key + '>'), 'didnt find closing key ' + key + ' in xml.', callback);
		// string or number value
		if (typeof value === 'string' || typeof value === 'number') {
			testing.assert(xmlString.contains(value), 'didnt find value ' + value + ' in xml.', callback);
		}
		// array value. List.
		else if (value instanceof Array) {
			value.forEach(function(item) {
				checkNode (key, item, xmlString, callback);
			});
		}
		// dictionary value
		else {
			for (var innerKey in value) {
				checkNode (innerKey, value[innerKey], xmlString, callback);
			}
		}
	}
}



 exports.test = function(callback) {
	testing.run({
		testValidJson: testValidJson
	}, callback);
};

 // start tests if invoked directly
if (__filename == process.argv[1]) {
    exports.test(testing.show);
}

