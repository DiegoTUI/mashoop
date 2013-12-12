'use strict';
//requires
var async = require('async');
var Log = require('log');
var log = new Log();
//var log = require('../util/log.js');
var config = require('../config.js');
var db = require('../db.js');
var core = require('../util/core.js');
var ATHotelList = require('../services/at-hotel-list.js').ATHotelList;
var ATHotelDetail = require('../services/at-hotel-detail.js').ATHotelDetail;
var testing = require('testing');
var JsonFormatter = require('../io/json-formatter.js').JsonFormatter;

/**
 * A parser for TicketAvailRQ. Connects to Atlas, makes a query,
 * and stores the results in the different databases.
 * queryParameters: the parameters of the query to be launched
 */
exports.HotelParser = function (queryParameters, isTesting) {
	// self-reference
	var self = this;
	//some handy vars
	var destinationCode = queryParameters.destination;
	var language = queryParameters.language;
	var itemCollection = null;
	var collectionName = 'hotels';
	//Description map to parse the response from hotelDetail
	var hotelDetailMap = [
		{'code':'Hotel.Code'},
		{'name':'Hotel.Name'},
		{'Hotel.DescriptionList.Description':[{'type': '@type'},
							 			{'description': ''}]},
		{'Hotel.ImageList.Image': [{'type': 'Type'},
							{'url': 'Url'},
							{'description': 'Description'}]},
		{'streetTypeId': 'Hotel.Contact.StreetTypeId'},
		{'streetTypeName': 'Hotel.Contact.StreetTypeName'},
		{'streetName': 'Hotel.Contact.StreetName'},
		{'streetNumber': 'Hotel.Contact.Number'},
		{'zipCode': 'Hotel.Contact.PostalCode'},
		{'city': 'Hotel.Contact.City'},
		{'countryCode': 'Hotel.Contact.CountryCode'},
		{'Hotel.Contact.EmailList.Email':[{'email': ''}]},
		{'Hotel.Contact.PhoneList.ContactNumber':[{'type': '@type'},
											{'number': ''}]},
		{'Hotel.Contact.WebList.Web':[{'web': ''}]},
		{'category': 'Hotel.Category'},
		{'destinationCode': 'Hotel.Destination.@code'},
		{'Hotel.Destination.ZoneList.Zone':[{'code': '@code'},
											{'name': ''}]},
		{'Hotel.FacilityList.Feature': [{'type': '@xsi:type'},
										{'group': '@group'},
										{'fee': '@fee'},
										{'code': 'Code'},
										{'name': 'Name'},
										{'value': 'Value'},
										{'description': 'Description'},
										{'DistanceList.Distance':[{'unit':'@unit'},
																	{'value': ''}]},
										]},
		{'chainCode':'Hotel.Chain.@code'},
		{'chainName':'Hotel.Chain'},
		{'licenseNumber': 'Hotel.licenseNumber'},
		{'latitude': 'Hotel.Position.@latitude'},
		{'longitude': 'Hotel.Position.@longitude'}
	];
	//Type map to define the non-string types to store in mongo
	var hotelDetailTypeMap = [
		{'latitude': 'float'},
		{'longitude': 'float'},
		{'featureList': [{'distanceList':[{'value': 'float'}]}]}
		];
	/**
	 * Public method to start the parsing
	 * callback: a function (error, result) to call back when the parsing has finished
	 */
	self.parseItems = function (callback) {
		db.addCallback(function(error, result) {
			if (error) {
				return callback(error);
			}
			itemCollection = result.collection(collectionName);
			readItems(callback);
		});
	};

	/**
	 * Read tickets from Atlas.
	 */
	function readItems(callback) {
		// call hotel list
		var hotelListRQ = new ATHotelList(queryParameters, null, null, /*forceCall*/ true);
		log.debug('Calling HotelList for ' + destinationCode + ' in ' + language);
		hotelListRQ.sendRequest(function (error, dataReceived) {
			if (error) {
				log.error('Error returned while calling ' + JSON.stringify(queryParameters) + ': ' + JSON.stringify(error));
				callback(error);
				return;
			}
			var itemsReceived = dataReceived.HotelList;
			log.debug('Received ' + itemsReceived.length + ' hotels for ' + destinationCode + ' in ' + language);
			// are we testing?
			if (isTesting) {
				log.debug ('WE ARE TESTING');
				//get only the 3 first hotels
				itemsReceived = itemsReceived.slice(0,3);
			}
			// make hotelDetail call for each hotel in the list
			var countHotels = 0;
			for (var i = 0; i < itemsReceived.length; i++ ) {
				var hotel = itemsReceived[i];
				queryParameters['code'] = hotel.Code;
				var hotelDetailRQ = new ATHotelDetail(queryParameters, hotelDetailMap, '', /*forceCall*/ true);
				log.debug('Calling HotelDetails for hotel ' + queryParameters.code + ' in destination ' + destinationCode + ' in ' + language);
				hotelDetailRQ.sendRequest(function (error, dataReceived) {
					if (error) {
						log.debug ("Error occurred in HotelDetailRQ: " + JSON.stringify(error));
						callback(error);
						return;
					}
					log.debug('Received hotel ' + dataReceived.name + ' with code ' + dataReceived.code);
					//update mongo
					updateMongo(dataReceived, function (error, result) {
						if (error) {
							log.error('Error returned while updating Mongo: ' + JSON.stringify(error));
							callback(error);
							return;
						}
						log.debug('Mongo updated correctly hotel with code: ' + result);
						countHotels++;
						if (countHotels == itemsReceived.length) {
							callback(error, countHotels);
						}
					});
				});
			};
		});
	}

	function updateMongo(dataReceived, callback) {
		//browse the db, and update the data of the hotel
		var hotel = dataReceived;
		//Decapitalize hotel keys
		hotel = core.decapitalizeKeys(hotel);
		//format types
		var jsonFormatter = new JsonFormatter(hotel, hotelDetailTypeMap);
		hotel = jsonFormatter.formatJson();
		//Items to set and unset
		var setItem = {
			code: hotel.code,
			name: hotel.name,
			streetTypeId: hotel.streetTypeId,
			streetTypeName: hotel.streetTypeName,
			streetName: hotel.streetName,
			streetNumber: hotel.streetNumber,
			zipCode: hotel.zipCode,
			city: hotel.city,
			destinationCode: destinationCode,
			countryCode: hotel.countryCode,
			category: hotel.category,
			chainCode: hotel.chainCode,
			chainName: hotel.chainName,
			licenseNumber: hotel.LicenseNumber,
			latitude: hotel.latitude,
			longitude: hotel.longitude
		};
		var unsetItem ={
			imageList: 1,
			emailList: 1,
			contactNumberList: 1,
			webList: 1,
			zoneList: 1
		};
		unsetItem['descriptionList.'+language] = 1;
		unsetItem['featureList.'+language] = 1;
		//Items to push
		var pushItem = {
			imageList: {'$each': hotel.imageList ? hotel.imageList : []},
			emailList: {'$each': hotel.emailList ? hotel.emailList : []},
			contactNumberList: {'$each': hotel.contactNumberList ? hotel.contactNumberList : []},
			webList: {'$each': hotel.webList ? hotel.webList : []},
			zoneList: {'$each': hotel.zoneList ? hotel.zoneList : []},
		};
		pushItem['descriptionList.' + language] = {'$each': hotel.descriptionList ? hotel.descriptionList : []};
		pushItem['featureList.' + language] = {'$each': hotel.featureList ? hotel.featureList : []};
		//Find the item, reuse the id, and update it
		async.waterfall([
		//find the item
		function (callback) {
			itemCollection.findOne({destinationCode: destinationCode, code:dataReceived.code}, function(error, retrievedItem) {
				callback(error, retrievedItem);
			});
		},
		//set and unset
		function (retrievedItem, callback) {
			setItem.id = retrievedItem ? retrievedItem.id : core.randomString(config.mongoIdLength);
			setItem.created = retrievedItem ? retrievedItem.created : new Date();
			setItem.lastUpdated = retrievedItem ? new Date() : setItem.created;
			itemCollection.update({code: hotel.code},
			{'$set': setItem, '$unset': unsetItem},
			{upsert: true}, function(error) {
				callback (error);
			});
		},
		//push
		function (callback) {
			itemCollection.update({code: hotel.code},
			{'$push': pushItem},
			{upsert: true}, callback);
		}],
		//callback for inner waterfall
		function (error/*, result*/) {
			if (error) {
				log.error ('Error while updating mongo');
				return callback(error);
			}
			//report success
			callback (error, hotel.code)
		});
	}

	return self;
};

/***********************************
 ************ UNIT TESTS ***********
 ***********************************/
function testHotelParser(testCallback) {
	config.mongoConnection = 'mongodb://127.0.0.1:27017/mashooptest';
	db.reconnect(function() {
		var itemCollection = db.getCollection('hotels');
		itemCollection.remove({}, function(/*error, result*/) {
			var languages = ['ENG', 'CAS'];
			var series = {};
			languages.forEach(function(language) {
				series[language] = getParserCounter(itemCollection, language);
			});
			async.series(series, function(error, result) {
				testing.check(error, testCallback);
				testing.success('Hotel parser success', testCallback);
			});
		});
	});
}

/**
 * Get a function to parse tickets and count them, then compare them.
 */
function getParserCounter(itemCollection, language, testCallback) {
	return function(callback) {
		var queryParameters = {
			language: language,
			destination: 'BCN'
		};
		var hotelParser = new exports.HotelParser(queryParameters,/*isTesting*/ true);
		hotelParser.parseItems(function (error, parsedItems) {
			testing.check(error, 'Could not parse hotels', testCallback);
			var countQuery = {
				destinationCode: 'BCN',
				code: {'$exists': true},
				name: {'$exists': true},
				latitude: {'$exists': true},
				longitude: {'$exists': true},
				imageList: {'$exists': true}
			};
			countQuery['featureList.' + language] =  {'$exists': true};
			countQuery['descriptionList.' + language] = {'$exists': true};
			itemCollection.count(countQuery, function (error, mongoCount) {
				testing.check(error, 'Could not count hotels', testCallback);
				testing.assertEquals(mongoCount, parsedItems, 'Didn\'t store all the parsed hotels in mongo for ' + language, testCallback);
				callback(null, true);
			});
		});
	};
}

exports.test = function(testCallback) {
	//change log object
	log = require('../util/log.js');
	testing.run({
		testHotelParser: testHotelParser
	}, 100000, function (error, result) {
		db.close(function(/*err*/) {
			log.debug('closing mongo');
			testCallback (error, result);
		});
	});
};

// start tests if invoked directly
if (__filename == process.argv[1]) {
    exports.test(testing.show);
}

