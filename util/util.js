/*
 * TuiInnovation util toolbox.
 * Global variables and functions.
 *
 * Copyright (C) 2013 TuiInnovation.
 */


/**
 * Pseudo-global for site-wide globals and functions.
 */
var util = new function()
{
	// self-reference
	var self = this;

	// urls

	// globals
	self.echoTokenLength = 8;
	self.sessionIdLength = 8;

	/**
	 * Find out if the argument is a string.
	 */
	self.isString = function(argument) {
		return typeof argument == 'string';
	}

    /**
     * Find out if an object is empty.
     */
     self.isEmpty = function(object) {
        return Object.keys(object).length === 0;
     }

	/**
	 * Clone an object, including functions.
	 */
	self.cloneObject = function(object) {
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
	self.toRad = function(number) {
		return number * Math.PI / 180;
	}

	/**
	 * Return the date object in ATLAS format: yyyymmdd.
	 */
	self.atlasDate = function(date) {
		 return (date.getFullYear()*10000 + (date.getMonth()+1)*100 + date.getDate()).toString();
	}

    /**
     * Return an ISO8601 formatted date for now.
     * From https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Date#Example.3a_ISO_8601_formatted_dates
     */
    self.isoDate = function(date) {
        return date.getUTCFullYear() + '-'
            + pad(date.getUTCMonth() + 1, 2) + '-'
            + pad(date.getUTCDate(), 2) + 'T'
            + pad(date.getUTCHours(), 2) + ':'
            + pad(date.getUTCMinutes(), 2) + ':'
            + pad(date.getUTCSeconds(), 2) + '.'
            + pad(date.getUTCMilliseconds(), 3) + 'Z'
    }

	/**
	 * Return a random string of length
	 */
	self.randomString = function(length) {
		 return Math.random().toString(36).substr(2, length);
	}

    /**
     * Process one result through a pipeline.
     * Each function is called in order; if it returns a value it replaces the original.
     */
    self.process = function(pipeline) {
        return function(data)
        {
            self.runPipeline(pipeline, data);
        };
    }

    /**
     * Run a value through a pipeline of functions.
     * Each function in the pipeline has its turn to use or modify the data.
     * If a function returns a value, it substitutes the original data.
     */
    self.runPipeline = function(pipeline, data) {
        while (pipeline.length > 0)
        {
            var callback = pipeline.shift();
            if (!callback)
            {
                continue;
            }
            if (!self.checkCallback(callback, 'Wrong callback in pipeline'))
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
    self.checkCallback = function(callback, message) {
        if (!callback)
        {
            return true;
        }
        if (typeof callback != 'function')
        {
            console.error(message);
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
    self.jsonToXml = function(jsonObject) {
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
            if (!(value instanceof Array))
                self.error ("Malformed JSON node with key " + key + " and value" + JSON.stringify(value));
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
}

//export module
module.exports = util;