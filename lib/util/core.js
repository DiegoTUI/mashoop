/*
 * TuiInnovation util toolbox.
 * Global variables and functions.
 *
 * Copyright (C) 2013 TuiInnovation.
 */
//requires
require("../util/prototypes.js");
var log = require("../util/log.js");
var testing = require('testing');


/**
 * Find out if the argument is a string.
 */
exports.isString = function(argument) {
	return typeof argument == 'string';
}

/**
 * Find out if an object is empty.
 */
exports.isEmpty = function(object) {
	return Object.keys(object).length === 0;
}

/**
 * Clone an object, including functions.
 */
exports.cloneObject = function(object) {
	var cloned = (object instanceof Array) ? [] : {};
	for (var i in object)
	{
		if (object[i] && typeof object[i] == "object")
		{
			cloned[i] = cloneObject(object[i]);
		}
		else
		{
			cloned[i] = object[i];
		}
	}
	return cloned;
};

/**
 * Converts numeric degrees to radians.
 */
exports.toRad = function(number) {
	return number * Math.PI / 180;
}

/**
 * Return the date object in ATLAS format: yyyymmdd.
 */
exports.atlasDate = function(date) {
	return (date.getFullYear()*10000 + (date.getMonth()+1)*100 + date.getDate()).toString();
}

/**
 * Return an ISO8601 formatted date for now.
 * From https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Date#Example.3a_ISO_8601_formatted_dates
 */
exports.isoDate = function(date) {
	return date.getUTCFullYear() + '-'
	+ pad(date.getUTCMonth() + 1, 2) + '-'
	+ pad(date.getUTCDate(), 2) + 'T'
	+ pad(date.getUTCHours(), 2) + ':'
	+ pad(date.getUTCMinutes(), 2) + ':'
	+ pad(date.getUTCSeconds(), 2) + '.'
	+ pad(date.getUTCMilliseconds(), 3) + 'Z'
}

/**
 * Decapitalize all dictionary keys in an entity (make first letter lower case)
* It enters arrays looking for objects
* the keys in "exceptions" will not be processed
*/
exports.decapitalizeKeys = function(entity, exceptions) {
	var result = null;
	exceptions = exceptions || [];
	if (entity instanceof Array) { //entity is an array
		result = [];
		entity.forEach(function(element){
			result.push(exports.decapitalizeKeys(element, exceptions));
		});
	} else if (entity instanceof Object) { //entity is a dictionary
		result = {};
		for (key in entity) {
			if (exceptions.indexOf(key) == -1) { //not in exceptions, process key
				result[key.decapitalizeFirstLetter()] = exports.decapitalizeKeys(entity[key], exceptions);
			} else { //the key is in "exceptions"
				result[key] = entity[key];
			}
		}
	} else { //entity is a string!!
		result = entity;
	}

	return result;
}

/**
 * Return a random string of length
*/
exports.randomString = function(length) {
	return Math.random().toString(36).substr(2, length);
}

/**
 * Process one result through a pipeline.
 * Each function is called in order; if it returns a value it replaces the original.
 */
exports.process = function(pipeline) {
	return function(data)
	{
		exports.runPipeline(pipeline, data);
	};
}

/**
 * Run a value through a pipeline of functions.
 * Each function in the pipeline has its turn to use or modify the data.
 * If a function returns a value, it substitutes the original data.
 */
exports.runPipeline = function(pipeline, data) {
	while (pipeline.length > 0)
	{
		var callback = pipeline.shift();
		if (!callback)
		{
			continue;
		}
		if (!exports.checkCallback(callback, 'Wrong callback in pipeline'))
		{
			continue;
		}
		var result = callback(data);
		if (result)
		{
			data = result;
		}
	}
	return data;
}

/**
 * Check that the callback is null, or a function.
 * Returns true, or shows an error and returns false.
 */
exports.checkCallback = function(callback, message) {
	if (!callback)
	{
		return true;
	}
	if (typeof callback != 'function')
	{
		log.error(message);
		return false;
	}
	return true;
}

/**
 * Produce an XML string from a properly formatted JSON.
 * Uses "@" for attributes, "#value" for values and "#list" for lists
* See testUtil examples to fully understand how this works
* @param jsonObject: a properly formatted JSON object
* @return a XML string with the XML representation of the JSON object
*/
exports.jsonToXml = function(jsonObject) {
	var xmlString = "";
	for (var key in jsonObject) {
		xmlString += processNode(key, jsonObject[key]);
	}
	return xmlString;
}

/**
 * Produce an XML string from a node of a JSON object.
 * @param key: the key of the JSON node
* @param value: the value of the JSON node
* @return a XML string with the XML representation of the JSON node
*/
function processNode(key, value) {
	var result = "";
	if (key === '#list') {  //It's a "no-key" list
		if (!(value instanceof Array)) {
			log.error ("Malformed JSON node with key " + key + " and value" + JSON.stringify(value));
		}
		for (var i=0; i< value.length; i++) {
			for (var innerKey in value[i]) {
				result += processNode (innerKey, value[i][innerKey]);
			}
		}  
	} else {    //It's a "regular" node
		result += '<' + key;
		if (typeof value === "string") {  //"regular" value
			result += '>' + value;
		} else if (value instanceof Array) { //it's a "key" list
			result += '>\n';
			for (var i=0; i< value.length; i++) {
				for (var innerKey in value[i]) {
					result += processNode (innerKey, value[i][innerKey]);
				}
			}   
		} else if (value instanceof Object) {   //the value is an object
			var innerKeys = Object.keys(value);
			var attributes = [];
			var textValue = null;
			var other = [];
			for (var i=0; i<innerKeys.length; i++) {
				if (innerKeys[i].startsWith('@'))
				attributes.push(innerKeys[i].substringFrom('@'));
			else if (innerKeys[i] === '#value')
			textValue = value[innerKeys[i]];
		else
		other.push(innerKeys[i]);
			}
			//check the attributes first
			for (var i=0; i<attributes.length; i++) {
				result += ' ' + attributes[i] + '="' + value["@"+attributes[i]] + '"';
			}
			//close the tag
			result += '>\n';
			//check the text value
			if (textValue)
			result += textValue;
		//check the rest of nodes
		for (var i=0; i<other.length; i++) {
			result += processNode(other[i], value[other[i]]);
		}
		}
		//close the tag
		result += '</' + key + '>\n';
	}
	return result;
}

/**
 * Pad a number to the given digits.
 */
function pad(n, digits) {
	var padded = n.toString();
	while (padded.length < digits)
	{
		padded = '0' + padded;
	}
	return padded;
}

/***********************************
 ************ UNIT TESTS ***********
 ***********************************/
function testDecapitalizeKeys (callback) {
	var dictionary = {
		Key1: "value1",
		key2: {
			date1: new Date(),
			Key3: {
				Key4: "value4",
				key5: "value5",
				Key6: {
					Date2: new Date()
				}
			}
		},
		Key7: "value7",
		key8: ["uno", "dos", "tres"],
		Key9: ["uno", {key10:"value10", Key11:{Key12:"value12"}}]
	}
	var exceptions = ["date1", "Date2"];
	var result = exports.util.decapitalizeKeys(dictionary, exceptions);
	testing.assert("key1" in result, "key1 not present", callback);
	testing.assert("key2" in result, "key2 not present", callback);
	testing.assert("key7" in result, "key7 not present", callback);
	testing.assert("date1" in result.key2, "date1 not present", callback);
	testing.assert("key3" in result.key2, "key3 not present", callback);
	testing.assert("key4" in result.key2.key3, "key4 not present", callback);
	testing.assert("key5" in result.key2.key3, "key5 not present", callback);
	testing.assert("key6" in result.key2.key3, "key6 not present", callback);
	testing.assert("Date2" in result.key2.key3.key6, "Date2 not present", callback);
	testing.assertEquals(result.key8.length, 3, "wrong length for key8", callback);
	testing.assertEquals(result.key9.length, 2, "wrong length for key9", callback);
	testing.assertEquals(result.key9.indexOf("uno"), 0, "wrong index for uno in for key9", callback);
	testing.assert("key10" in result.key9[1], "key10 not present", callback);
	testing.assert("key11" in result.key9[1], "key11 not present", callback);
	testing.assert("key12" in result.key9[1].key11, "key12 not present", callback);
	testing.success(callback);
}
function testXmlToJson (callback) {
	var jsonObject = {
		HotelListRQ: {
			"@echoToken": "DummyEchoToken",
			"@xmlns": "http://www.hotelbeds.com/schemas/2005/06/messages",
				"@xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
				"@xsi:schemaLocation": "http://www.hotelbeds.com/schemas/2005/06/messages HotelListRQ.xsd",
				Language: "ENG",
			Credentials:{
				User: "ISLAS",
				"Password": "ISLAS"
			},
			Destination:{
				"@code": "PMI",
				"@type": "SIMPLE",
				"#value": "Palma"
			},
			ZoneList:[{zone:{"@code":"01",
				"name":"Alcudia"}},
				{zone:{"@code":"02",
					"name":"Andratx"}},
					{zone:{"@code":"03",
						"name":"Portals"}}
			],
			"#list":[{classification:{"@code":"01",
				"#value":"class1"}},
				{classification:{"@code":"02",
					"#value":"class2"}}
			]
		}
	}

	var xmlString = exports.util.jsonToXml(jsonObject);
	for (var key in jsonObject) {
		checkNode(key, jsonObject[key], xmlString);
	}

	function checkNode(key, value, xmlString) {
		if (key.startsWith('@')) {
			testing.assert(xmlString.contains(key.substringFrom('@'))===true,'attribute ' + key + ' passed correctly', callback);
		} else if (key === '#value') {
			testing.assert(xmlString.contains(value)===true, 'Value ' + value + ' passed correctly', callback);
		} else if (key === '#list') {
			for (var i=0; i<value.length; i++) {
				for (var innerKey in value[i]) {
					checkNode(innerKey, value[i][innerKey], xmlString);
				}
			}
		} else {
			testing.assert(xmlString.contains('<'+key)===true, 'key ' + key + ' found in opening', callback);
			testing.assert(xmlString.contains('</'+key+'>')===true, 'key ' + key + ' found in closing', callback);
			if (typeof value === "string") {
				testing.assert(xmlString.contains(value)===true, 'string ' + value + 'found', callback);
			} else if (value instanceof Array) {
				for (var i=0; i<value.length; i++) {
					for (var innerKey in value[i]) {
						checkNode(innerKey, value[i][innerKey], xmlString);
					}
				}
			} else if (value instanceof Object) {
				for (var innerKey in value) {
					checkNode(innerKey, value[innerKey], xmlString);
				}
			}
		}
	}

	testing.success(callback);
}

exports.test = function(callback) {
	testing.run({
		testXmlToJson: testXmlToJson,
		testDecapitalizeKeys: testDecapitalizeKeys
	}, callback);
}

// start tests if invoked directly
if (__filename == process.argv[1]) {
	exports.test(testing.show);
}
