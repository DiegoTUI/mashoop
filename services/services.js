'use strict';
/*
 * Collection of services for the nodejs server
 *
 * Copyright (C) 2013 TuiInnovation.
 */

//requires
var util = require('../util/util.js');

//Init services
 var services = {};

 services.ATTicketAvail = require('./ATTicketAvail.js');
 services.FSVenueSearch = require('./FSVenueSearch.js');

 module.exports = services;
