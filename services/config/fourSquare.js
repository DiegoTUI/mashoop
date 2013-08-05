'use strict';
/*
 * Atlas requests and description maps.
 *
 * Copyright (C) 2013 TuiInnovation.
 */


/**
 * Pseudo-global to store Atlas requests and description maps
 */
 var mainUrl = 'https://api.foursquare.com/v2/';
 var fourSquare = {
  clientId: 'X3K5ZBVTWBXWUL0N0MJE0LMAWQMSMUGGEUS1MH0QS5O2BIUR',
  clientSecret: 'GJZS1WPNU5K5QMJOTA01MK2TRSDQBDM3ZBRMC40YFZ1BMZZG',
	venueSearchUrl: mainUrl + 'venues/search'
};

//export module
module.exports = fourSquare;