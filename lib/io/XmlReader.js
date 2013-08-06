'use strict';
/*
 * TuiInnovation nodejs.
 * XML Reader: receives an xml string and a description map and returns an array of objects
 *
 * Copyright (C) 2013 TuiInnovation.
 */

require("../util/core.js");

/**
 * The XML reader.
 * xmlString: the xml in string format
 * descriptionMap: an array representing the values to be extracted from the xml.
 * tag: the tag to indicate which objects in the xml should we look for. Root if undefined or null
 * see xmlreader-tests to fully understand this class
 */
var XmlReader = function(xmlString, descriptionMap, tag)
{
	// self-reference
	var self = this;
	//Requires
	var util = require('../util/util.js');
	var log = require('../util/log.js');

	/**
	 * Reads the objects from the xmlString using the descriptionMap
	 * Returns an array of JS objects
	 * tag: the tag representing the objects in the xml to be read
	 */
	self.readObjects = function(callback) {
		//initialize result
		var result =[];
		//parse the xmlString in a JSON
		var parser = require('xml2js').Parser();
		parser.on("end", function(xmlObject){
			var objectToBrowse = (tag && (tag.length > 0)) ? findTag(xmlObject, tag) : xmlObject[Object.keys(xmlObject)[0]];
			if (objectToBrowse == null) {
				result = null;
			} else if (objectToBrowse instanceof Array) {
				for (var i=0; i<objectToBrowse.length; i++) {
					var elementToPush = processElement(objectToBrowse[i], descriptionMap); 
					if (!util.isEmpty(elementToPush))
						result.push(elementToPush);	
				}
			} else  { //It's an object
				var elementToPush = processElement(objectToBrowse, descriptionMap); 
				if (!util.isEmpty(elementToPush)){
					result = elementToPush;
				}
			}
			callback(result);
		});
		parser.parseString(xmlString);
	}

	/**
	 * Recursive function to find a tag in the xmlObject and return the value of it
	 * Returns null if the tag was not found
	 */
	 function findTag(xmlObject, tag) {
	 	if (xmlObject instanceof Array) {
	 		for (var i=0; i<xmlObject.length; i++) {
	 			var result = findTag(xmlObject[i], tag);
	 			if (result)
	 				return result;
	 		}
	 	} else if (typeof xmlObject === "object") {
	 		for (var key in xmlObject) {
	 			if (tag === key) {
	 				return xmlObject[key];
	 			} else {
	 				var result = findTag(xmlObject[key], tag);
	 				if (result)
	 					return result;
	 			}
	 		}
	 	}
	 	return null;
	 }

	/**
	 * Process an element of the xml according to the description Map and returns an object
	 * element: a JSON object containing the element to be processed
	 */
	function processElement(element, descriptionMap) {
		//initialize result
		var result = {};
		//iterate descriptionMap
		for (var i=0; i<descriptionMap.length; i++) {
			var item = descriptionMap[i];
			if (typeof item === 'string') {	//It's a string
				if (item in element)
					result[item] = getValue(element[item][0]);
			} 
			else if (typeof item === 'object') {	//It's a dictionary
				 if (Object.keys(item).length !== 1) {
                    log.error ("Malformed descriptionMap. More than 1 element in object: " + JSON.stringify(item));
                } else {
					//get the first (and only) key of the dictionary
					for (var key in item) {
						var value = item[key];
						if (value instanceof Array) {	//It's a list
							//get the array that contains the list
							var theList = listInXml(element,key);
							if (theList != null) {
								//initialize list
								var listifiedKey = key.listify();
								result[listifiedKey] = [];
								
								if (!(theList instanceof Array)) {
									log.error("listInXml returned a non array for key " + key);
								} else {
									for(var j=0; j<theList.length; j++) {
										result[listifiedKey].push(processElement(theList[j], value));
									}
								}
							}
						}
						else if (typeof value === 'string') {	//It's a deep value
							var potentialValue = valueInXml(element, value);
							if (potentialValue != null)
								result[key] = potentialValue;
						}
						break;	//we only consider the first key
					}
				}
			} 
		}
		return result;
	}

	/**
	 * Returns the text value of a node
	 */
	function getValue (node) {
		if (typeof node === 'string')
			return node;
		if ('_' in node)
			return node['_'];
		return null;
	}


	/**
	 * Explores an xml jQuery object and returns the list in path
	 * xmlObject: a JSON object containing the xml to look in
	 * path: a string like "TicketInfo.DescriptionList.Description" containing the path to look in.
	 */
	function listInXml (xmlObject, path) {
		var result = xmlObject;
		var pathArray = path.split(".");
		for (var i=0; i<(pathArray.length-1); i++) {
			if (pathArray[i] in result)
				result = result[pathArray[i]][0];
			else
				return null;
		}
		if (pathArray[pathArray.length-1] in result)
			return result[pathArray[pathArray.length-1]];
		return null;
	}

	/**
	 * Explores an xml jQuery object and returns the value in path
	 * xmlObject: a DOM object containing the xml to look in
	 * path: a string like "Description.@languageCode" containing the path to look in. "@" is for attributes
	 */
	function valueInXml (xmlObject, path) {
		var realPath = path.startsWith('@') ? path.substringUpTo('@') : path.substringUpTo('.@');
		var attribute = path.substringFrom('@');
		var realPathArray = realPath.length==0 ? [] : realPath.split(".");
		var tip = xmlObject;
		for (var i=0; i<realPathArray.length; i++) {
			if (realPathArray[i] in tip)
				tip = tip[realPathArray[i]][0];
			else
				return null;
		}
		var value = null;
		if (attribute === '') {	//No attributes
			value = getValue(tip);
		}
		else {	//There is an attribute at the end
			if (('$' in tip) && (attribute in tip['$']))
			value = tip['$'][attribute];
		}
		return value;
	}

	return self;
}

module.exports = XmlReader;

