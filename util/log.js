/*
 * TuiInnovation log class.
 * Global variables and functions.
 *
 * Copyright (C) 2013 TuiInnovation.
 */


/**
 * Pseudo-global for site-wide globals and functions.
 */
var log = new function()
{
	// self-reference
	var self = this;
    // requires
    var util = require("./util.js");

    /**
     * Show an info message.
     */
    self.info = function(message) {
        message = '[' + util.isoDate(new Date()) + '] ' + message;
        console.log(message);
    }

    /**
     * Log an error message, with ERROR priority.
     */
    self.error = function(message)
    {
        if (typeof(message) === 'object') {
            message = 'Error';
        }
        // on node show in red with date and ERROR
        console.error('\u001b[31m' + '[ERROR][' + util.isoDate(new Date()) + '] ' + message + '\u001b[0m');
    }
	
    return self;
}

//export module
module.exports = log;