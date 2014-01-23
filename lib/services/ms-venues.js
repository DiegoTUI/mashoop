'use strict';
/*
 * TuiInnovation nodejs.
 * MSVenues: performs a venue search in foursquare and a ticket search in ATLAS 
 * and returns the combined results
 * The input parameters are:
 * ll=(latitude,longitude)
 * radius = (in meters)
 *
 * Copyright (C) 2013 TuiInnovation.
 */
//requires
var log = require('../util/log.js');
var db = require('../db.js');
var FSVenueSearch = require('./fs-venue-search.js').FSVenueSearch;
var async = require('async');
var testing = require('testing');

/**
 * The MSVenues request.
 * queryParameters: the parameters to perform the call
 */
exports.MSVenues = function(queryParameters) {
	// self-reference
	var self = this;
	//debug mode
	var debug = ('debug' in queryParameters);
	/**
	 * Calls several services in parallel and processes the results
	 * callback follows the function(error, result) nodejs convention
	 */
	self.sendRequest = function(callback) {
		// check if compulsory parameters are sent
		if (!validQueryParameters(['ll', 'radius'])) {
			var errorToSend = {
				error: '004-bad-request',
				statusCode: 400,
				description: 'Both ll (latitude,longitude) and radius (in meters) are mandatory for this service',
				contact: 'dlafuente@tuitravel-ad.com'};
			return callback(errorToSend);
		}
		// create the stream of calls
		// add category id to the query to only look for foursquare restaurants
		queryParameters['categoryId'] = '4d4b7105d754a06374d81259';
		var fsVenueSearch = new FSVenueSearch (queryParameters);
		var stream = {};
		stream.foursquare = fsVenueSearch.sendRequest;
		stream.atlas = makeRequest;
		// launch the stream of calls in parallel
		async.parallel(stream, processResponse);

		/**
		 * Process the response received by the parallel call and call back
		 */
		 function processResponse(error, result) {
			if (error) {
				log.debug ('Error returned by async parallel Search: ' + JSON.stringify(error));
				callback(error);
			} else {
				// Process the response and return something mobile-friendly
				produceMobileResponse(result, callback);
			}
		 }
	};

	/**
	 * Make the atlas request to MongoDB.
	 */
	function makeRequest(callback) {
		// constants
		var itemCollectionName = 'tickets';
		// open database
		db.addCallback(function(error, result) {
			if (error) {
				var errorToSend = {
					error: '007-db-access-error',
					statusCode: 500,
					description: 'There was an error when trying to open the database',
					contact: 'dlafuente@tuitravel-ad.com',
				};
				if (debug) {
					errorToSend.stack = JSON.stringify(error);
				}
				return callback(errorToSend);
			}
			var itemCollection = result.collection(itemCollectionName);
			if (!itemCollection) {
				var errorToSend = {
					error: '007-db-access-error',
					statusCode: 500,
					description: 'There was an error when trying to access the ' + itemCollectionName + ' collection',
					contact: 'dlafuente@tuitravel-ad.com',
				};
				if (debug) {
					errorToSend.stack = JSON.stringify(new Error());
				}
				return callback(errorToSend);
			}
			// get query parameters
			var latlon = queryParameters.ll.split(',');
			var latitude = parseFloat(latlon[0]);
			var longitude = parseFloat(latlon[1]);
			var radius = parseInt(queryParameters.radius);
			log.debug('Latitude: ' + latitude + '. Longitude: ' + longitude + '. Radius: ' + radius);
			// build query and fields
			var query = {loc:{'$near':
								{'$geometry': 
									{type: 'Point',
										coordinates:[longitude, latitude]}
								},
								'$maxDistance': radius
							}
						};
			var fields = {'name.ENG':1, imageList:1, 'descriptionList.ENG':1, priceList:1, loc:1, code:1, indoor:1, morning:1, afternoon:1, evening:1, fullday:1};
			var options = {};
			// go find tickets
			itemCollection.find(query, fields, options, function(error, result) {
				if (error) {
					var errorToSend = {error:'007-db-access-error',
						statusCode: 500,
						description: 'There was an error when trying to access the database',
						contact: 'dlafuente@tuitravel-ad.com',
					};
					if (debug) {
						errorToSend.stack = JSON.stringify(error);
					}
					return callback(errorToSend);
				}
				result.toArray(function (error, results) {
					callback(null, results);
				});
			});
		});
	}

	/**
	 * Checks that all the compulsory parameters are in 'queryParameters'
	 * mandatory: an array of strings containing the mandatory parameters
	 * returns true if all the mandatory parameters are in the query
	 */
	function validQueryParameters(mandatory) {
		var result = true;
		mandatory.forEach(function(parameter) {
			if (!(parameter in queryParameters)) {
				result = false;
			}
		});
		return result;
	}

	/**
	 * Produce a mobile response from the received data
	 */
	 function produceMobileResponse(data, callback) {
	 	var result = [];
	 	// get the ATLAS results
	 	data.atlas.forEach(function(atlasElement) {
	 		// name, code and type
	 		var elementToAdd = {
	 			name: atlasElement.name.ENG,
	 			code: atlasElement.code,
	 			type: 'atlas'
	 		};
	 		// description
	 		elementToAdd['description'] = atlasElement.descriptionList.ENG[0].description;
	 		// image (get the first "L" image in the list)
	 		atlasElement.imageList.forEach(function(imageObject){
	 			if(imageObject.type == 'L') {
	 				return elementToAdd['imageUrl'] = imageObject.url;
	 			}
	 		});
	 		// latitude and longitude
	 		elementToAdd['longitude'] = atlasElement.loc.coordinates[0];
	 		elementToAdd['latitude'] = atlasElement.loc.coordinates[1];
	 		// flags
	 		elementToAdd['indoor'] = atlasElement.indoor;
	 		elementToAdd['morning'] = atlasElement.morning;
	 		elementToAdd['afternoon'] = atlasElement.afternoon;
	 		elementToAdd['evening'] = atlasElement.evening;
	 		elementToAdd['fullday'] = atlasElement.fullday;
	 		// add element
	 		result.push(elementToAdd);
	 	});
	 	// get the Foursquare results
	 	data.foursquare.venues.forEach(function(foursquareElement) {
	 		// name, code and type, latitude, longitude
	 		var elementToAdd = {
	 			name: foursquareElement.name,
	 			code: foursquareElement.id,
	 			type: 'foursquare',
	 			latitude: foursquareElement.location.lat,
	 			longitude: foursquareElement.location.lng
	 		};
	 		// add element
	 		result.push(elementToAdd);
	 	});
	 	// call back with the results
	 	callback (null, result);
	 }

	return self;
};
/***********************************
 ************ UNIT TESTS ***********
 ***********************************/
function testValidMashoopVenues(callback) {
	function msCallback (error, result) {
		testing.assert(error === null, 'Valid request to Mashoop venues returned an error: ' + JSON.stringify(error), callback);
		testing.assert(result, 'Valid request to Mashoop venues did not return any result', callback);
		testing.success(callback);
	}
	var parameters = {
		ll: '40.416775,-3.70379',
		radius: 3000
	};

	var msVenues = new exports.MSVenues(parameters);
	msVenues.sendRequest(msCallback);
}

exports.test = function(callback) {
	testing.run({
		testValidMashoopVenues: testValidMashoopVenues
	}, 100000, function(error, result) {
		db.close(function(/*err*/) {
			log.debug('closing mongo');
			callback (error, result);
		});
	});
};

 // start tests if invoked directly
if (__filename == process.argv[1]) {
    exports.test(testing.show);
}
