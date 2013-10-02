'use strict';
/*
 * TuiInnovation log class.
 * Global variables and functions.
 *
 * Copyright (C) 2013 TuiInnovation.
 */


/**
 * Pseudo-global for site-wide globals and functions.
 */
var Log = require('log');

//export module
module.exports = new Log(require('../config.js').logLevel);