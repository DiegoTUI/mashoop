'use strict';
//requires
var async = require('async');
var log = require('../../../lib/util/log.js');
var config = require('../../../lib/config.js');
var db = require('../../../lib/util/db.js');
var util = require('../../../lib/util/util.js').util;
var mongo = require('mongodb');
var ATTicketAvail = require('../../../lib/services/at-ticket-avail.js').ATTicketAvail;
var testing = require('testing');

/**
 * A parser for TicketAvailRQ. Connects to Atlas, makes a query,
 * and stores the results in the different databases.
 * queryParameters: the parameters of the query to be launched
 */
exports.TicketAvailParser = function (queryParameters) {
	// self-reference
	var self = this;
	//some handy vars
	var destinationCode = queryParameters.destination;
	var language = queryParameters.language;
	var ticketCollection = null;
	//Description map to parse the response
	var ticketAvailMap = [
		{'code': 'TicketInfo.Code'},
		{'name': 'TicketInfo.Name'},
		{'currencyCode': 'Currency.@code'},
		{'TicketInfo.DescriptionList.Description':[{'type': '@type'},
							 			{'description': ''}]},
		{'TicketInfo.ImageList.Image': [{'type': 'Type'},
									{'order': 'Order'},
									{'visualizationOrder': 'VisualizationOrder'},
									{'url': 'Url'}]},
		{'AvailableModality':[{'code':'@code'},
							{'name':'Name'}, 
							{'contractName':'Contract.Name'},
							{'PriceList.Price':[{'amount':'Amount'},
												{'description':'Description'}]},
							{'childAgeFrom':'ChildAge.@ageFrom'},
							{'childAgeTo':'ChildAge.@ageTo'}]}];

 	
	/**
	 * Public method to start the parsing
	 * callback: a function (error, result) to call back when the parsing has finished
	 */
	self.parseTickets = function (callback) {
		db.addCallback(function(error, result) {
			if (error) {
				return callback(error);
			}
			ticketCollection = db.getCollection('tickets');
			readTickets(callback);
		});
	}

	/**
	 * Read tickets from Atlas.
	 */
	function readTickets(callback) {
	 	var ticketAvailRQ = new ATTicketAvail(queryParameters, ticketAvailMap, "ServiceTicket", /*forceCall*/ true);
	 	log.info("Calling ATLAS for " + destinationCode + " in " + language);
	 	ticketAvailRQ.sendRequest(function (error, dataReceived) {
	 		if (error) {
	 			log.error('Error returned while calling ' + JSON.stringify(queryParameters) + ": " + JSON.stringify(error));
	 			callback(error);
	 			return;
	 		}
	 		log.info("Received " + dataReceived.length + " tickets for " + destinationCode + " in " + language);
			//update mongo
			updateMongo(dataReceived, function (error, parsedTickets) {
				if (error) {
					log.error('Error returned while updating Mongo: ' + JSON.stringify(error));
 					callback(error);
 					return;
				}
				log.info("Mongo updated correctly");
				callback(error, parsedTickets);
			});
	 	});
	}

	function updateMongo(dataReceived, callback) {
		//browse the tickets, update the db
		var countTickets = 0;
		dataReceived.forEach(function(ticket, index) {
			//Decapitalize ticket keys
			ticket = util.decapitalizeKeys(ticket);
			//Items to set and unset
			var setItem = {
				code: ticket['code'],
				currencyCode: ticket['currencyCode'],
				destinationCode: destinationCode
			};
			setItem["name."+language] = ticket.name;
			var unsetItem ={
				imageList: 1,
				availableModalityList: 1
			};
			unsetItem["descriptionList."+language] = 1;
			//Items to push
			var pushItem = {
				imageList: {'$each': ticket["imageList"]},
				availableModalityList: {'$each': ticket["availableModalityList"]},
			};
			pushItem["descriptionList." + language] = {'$each': ticket["descriptionList"]};
			//Find the item, reuse the id, and update it
			async.waterfall([
			//find the item
			function (callback) {
				ticketCollection.findOne({destinationCode: destinationCode, code:ticket.code}, function(error, retrievedTicket) {
					callback(error, retrievedTicket)
				});
			},
			//set and unset
			function (retrievedTicket, callback) {
				setItem["id"] = retrievedTicket ? retrievedTicket.id : util.randomString(util.mongoIdLength);
				setItem["created"] = retrievedTicket ? retrievedTicket.created : new Date();
				setItem["lastUpdated"] = retrievedTicket ? new Date : setItem["created"];

				ticketCollection.update({code: ticket['code']},
				{'$set': setItem, '$unset': unsetItem},
				{upsert: true}, function(error) {
					callback (error);
				});
			},
			//push
			function (callback) {
				ticketCollection.update({code: ticket['code']},
				{'$push': pushItem},
				{upsert: true}, callback);
			}],
			//callback for inner waterfall
			function (error, result) {
				if (error) {
					log.error ("Error while updating mongo");
					callback(error);
					return;
				}
				countTickets++;
				//Update success, check if finished
				if (dataReceived.length == countTickets) {
					log.info("updateMongo success. Close and callback")
					//close and callback
					db.close(true, function(error) {
						callback (error, dataReceived.length);
					});
				}
			}
			);
		});
	}

	return self;
}

/***********************************
 ************ UNIT TESTS ***********
 ***********************************/
function testTicketAvailParser(callback) {
	config.mongoConnection = 'mongodb://127.0.0.1:27017/mashoop';
		db.reconnect(function() {
		var ticketCollection = db.getCollection('tickets');
		ticketCollection.remove({}, function(error, result) {
			var queryParameters = {
				pagesize: "2000",
				language: "ENG",
				destination: "BCN"
			};
			var ticketAvailParser = new exports.TicketAvailParser(queryParameters);
			ticketAvailParser.parseTickets(function (error, parsedTicketsENG) {
				var parsedTickets = {ENG: parsedTicketsENG};
				var queryParameters = {
					pagesize: "2000",
					language: "CAS",
					destination: "BCN"
				};
				var ticketAvailParser = new exports.TicketAvailParser(queryParameters, /*testing*/ true);
				ticketAvailParser.parseTickets(function (error, parsedTicketsCAS) {
					parsedTickets["CAS"] = parsedTicketsCAS;
					var countQuery = {};
					countQuery["destinationCode"] = "BCN";
					countQuery["name.ENG"] = {"$exists": true};
					countQuery["descriptionList.ENG"] = {"$exists": true};
					ticketCollection.count(countQuery, function (error, mongoCountENG) {
						var mongoCount = {ENG: mongoCountENG}
						var countQuery = {};
						countQuery["destinationCode"] = "BCN";
						countQuery["name.CAS"] = {"$exists": true};
						countQuery["descriptionList.CAS"] = {"$exists": true};
						ticketCollection.count(countQuery, function (error, mongoCountCAS) {
							mongoCount["CAS"] = mongoCountCAS;
							for (var key in parsedTickets) {
								testing.assertEquals(mongoCount[key], parsedTickets[key], "Didn't store all the parsed tickets in mongo for " + key, callback);
							}
						});
					});
				});
			});
		});
	});
}

exports.test = function(callback) {
	testing.run({
		testTicketAvailParser: testTicketAvailParser
	}, 100000, callback);
}

 // start tests if invoked directly
if (__filename == process.argv[1]) {
    exports.test(testing.show);
}



