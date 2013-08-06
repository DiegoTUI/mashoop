'use strict';
/*
 * TuiInnovation nodejs.
 * Core: prototype changes, clone object, error.
 *
 * Copyright (C) 2013 TuiInnovation.
 */


/**
 * Modify javascript prototypes.
 */

/**
 * Find out if the string has the argument at the beginning.
 */
String.prototype.startsWith = function (str)
{
	return this.slice(0, str.length) == str;
};

/**
 * Find out if the string has the argument at the end.
 */
String.prototype.endsWith = function (str)
{
	return this.slice(this.length - str.length) == str;
};

/**
 * Find out if the string contains the argument at any position.
 */
String.prototype.contains = function(str)
{
	return this.indexOf(str) != -1;
};

/**
 * Return the piece of string until the argument is found.
 * 'hi.there'.substringUpTo('.') => 'hi'
 */
String.prototype.substringUpTo = function(str)
{
	if (!this.contains(str))
	{
		return this;
	}
	return this.slice(0, this.indexOf(str));
}

/**
 * Return the piece of string starting with the argument; empty string if not found.
 * 'hi.there'.substringFrom('.') => 'there'
 */
String.prototype.substringFrom = function(str)
{
	if (!this.contains(str))
	{
		return '';
	}
	return this.slice(this.indexOf(str) + 1);
}

/**
 * Return the piece of string starting with the last instance of the argument; empty string if not found.
 * 'hi.there.you'.substringFromLast('.') => 'your'
 */
String.prototype.substringFromLast = function(str)
{
	if (!this.contains(str))
	{
		return '';
	}
	return this.slice(this.lastIndexOf(str) + 1);
}

/**
 * Splits the string using the dot as separator and returns the last element of the split with "List"
 * added at the end.
 */
String.prototype.listify = function ()
{
	return this.split('.').pop() + "List";
};

