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

module.exports = ParametrizedString;

