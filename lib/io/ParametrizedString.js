'use strict';
/*
 * TuiInnovation nodejs.
 * Parametrized string: a string with $keys$ to be replaced by actual params
 *
 * Copyright (C) 2013 TuiInnovation.
 */

require("../util/core.js");

/**
 * The parametrized string.
 * baseString: the string with the $keys$ in it
 * parameters: a dictionary with keys and values to be replaced in the baseString
 */
var ParametrizedString = function(baseString, parameters)
{
	// self-reference
	var self = this;

	/**
	 * Returns baseString with all the parameters replaced
	 */
	self.replaceAll = function() {
		var replaced = baseString;

		if (baseString && parameters) {
			for (var key in parameters) {
				replaced = replaced.replace("$"+key+"$",parameters[key]);
			}
		}

		return replaced;
	}

	/**
	 * Returns baseString with all the parameters replaced and the loose keys cleaned
	 */
	self.replaceAllClean = function() {
		var replaced = self.replaceAll();
		var looseKeys = self.getLooseKeys();
		for (var i=0; i<looseKeys.length; i++) {
			replaced = replaced.replace(looseKeys[i], '');
		}

		return replaced;
	}

	/**
	 * Returns an array of strings with the $keys$ that are in baseString, but not in parameters
	 */
	 self.getLooseKeys = function() {
	 	var replaced = self.replaceAll();
	 	var result = [];
	 	if (typeof replaced != 'undefined') {
	 		var matched = replaced.match(/\$[^\$]+\$/g);
	 		result = (matched === null) ? [] : matched;

	 	}
	 	return result;
	 }

	return self;
}

exports.ParametrizedString = ParametrizedString;

/***********************************
 ************ UNIT TESTS ***********
 ***********************************/
var testing = require('testing');
var testBaseString = 'Hallo $who$. You $action$ my $relative$ $times$';

function testUndefinedParamString (callback) {
	var paramString = new ParametrizedString ();
	testing.assertEquals(typeof(paramString.replaceAll()), 'undefined', 'empty parametrizedString did not return undefined', callback);
	testing.assertEquals(paramString.getLooseKeys().length, 0, 'empty parametrizedString returned non-empty loose keys', callback)
    testing.success(callback);
}

function testExactMatch (callback) {
	var params = {
			who: "peoples",
			action: "fuck",
			relative: "mother",
			times: "twice"
		};
	var paramString = new ParametrizedString (testBaseString, params);
	testing.assertEquals(paramString.replaceAll(), 'Hallo peoples. You fuck my mother twice', 'string was not replaced correctly', callback);
	testing.assertEquals(paramString.replaceAllClean(), 'Hallo peoples. You fuck my mother twice', 'string was not replaced correctly', callback);
	testing.assertEquals(paramString.getLooseKeys().length, 0, 'exact match. There should not be loose keys', callback);
	testing.success(callback);
}

function testTooManyParams (callback) {
	var params = {
		who: "peoples",
		action: "fuck",
		relative: "mother",
		times: "twice",
		extra1: "extra1",
		extra2: "extra2"
	};
	var paramString = new ParametrizedString (testBaseString, params);
	testing.assertEquals(paramString.replaceAll(), 'Hallo peoples. You fuck my mother twice', 'string was not replaced correctly', callback);
	testing.assertEquals(paramString.replaceAllClean(), 'Hallo peoples. You fuck my mother twice', 'string was not replaced correctly', callback);
	testing.assertEquals(paramString.getLooseKeys().length, 0, 'too many params. There should not be loose keys', callback);
	testing.success(callback);
}

function testTooFewParams (callback) {
	var params = {
		who: "peoples",
		action: "fuck",
		extra2: "extra2"
	};
	var paramString = new ParametrizedString (testBaseString, params);
	testing.assertEquals(paramString.replaceAll(), 'Hallo peoples. You fuck my $relative$ $times$', 'string was not replaced correctly', callback);
	testing.assertEquals(paramString.replaceAllClean(), 'Hallo peoples. You fuck my  ', 'string was not replaced correctly', callback);
	testing.assertEquals(paramString.getLooseKeys().length, 2, 'Should have 2 loose keys', callback);
	testing.success(callback);
}

exports.test = function(callback) {
	testing.run({
		testUndefinedParamString: testUndefinedParamString,
		testExactMatch: testExactMatch,
		testTooManyParams: testTooManyParams,
		testTooFewParams: testTooFewParams,
	}, callback);
}
// start tests if invoked directly
if (__filename == process.argv[1])
{
    exports.test(testing.show);
}

