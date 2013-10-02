'use strict';
/*
 * TuiInnovation nodejs.
 * Prototype changes.
 * Modify javascript prototypes.
 *
 * Copyright (C) 2013 TuiInnovation.
 */


/**
 * Find out if the string has the argument at the beginning.
 */
String.prototype.startsWith = function (str) {
	return this.slice(0, str.length) == str;
};

/**
 * Find out if the string has the argument at the end.
 */
String.prototype.endsWith = function (str) {
	return this.slice(this.length - str.length) == str;
};

/**
 * Find out if the string contains the argument at any position.
 */
String.prototype.contains = function(str) {
	return this.indexOf(str) != -1;
};

/**
 * Return the piece of string until the argument is found.
 * 'hi.there'.substringUpTo('.') => 'hi'
 */
String.prototype.substringUpTo = function(str) {
	if (!this.contains(str))
	{
		return this;
	}
	return this.slice(0, this.indexOf(str));
};

/**
 * Return the piece of string starting with the argument; empty string if not found.
 * 'hi.there'.substringFrom('.') => 'there'
 */
String.prototype.substringFrom = function(str) {
	if (!this.contains(str))
	{
		return '';
	}
	return this.slice(this.indexOf(str) + 1);
};

/**
 * Return the piece of string starting with the last instance of the argument; empty string if not found.
 * 'hi.there.you'.substringFromLast('.') => 'your'
 */
String.prototype.substringFromLast = function(str) {
	if (!this.contains(str))
	{
		return '';
	}
	return this.slice(this.lastIndexOf(str) + 1);
};

/**
 * Capitalizes the first letter of a string "hello world" -> "Hello world"
 */
String.prototype.capitalizeFirstLetter = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
};

/**
 * Decapitalizes the first letter of a string "Hello World" -> "hello World"
 */
String.prototype.decapitalizeFirstLetter = function() {
    return this.charAt(0).toLowerCase() + this.slice(1);
};

/**
 * Splits the string using the dot as separator and returns the last element of the split with "List"
 * added at the end.
 */
String.prototype.listify = function () {
	return this.split('.').pop() + 'List';
};

/**
 * Turns a file-like string ("at-ticket-avail") into a service-like string ("ATTicketAvail")
 * added at the end.
 */
String.prototype.servify = function () {
	var words = this.split('-');
	words[0] = words[0].toUpperCase();
	for (var i = 1; i < words.length; i++ ) {
		words[i] = words[i].capitalizeFirstLetter();
	}
	return words.join('');
};

