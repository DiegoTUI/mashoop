'use strict';
//requires
var async = require('async');
var log = require('../../../lib/util/log.js');
var util = require('../../../lib/util/util.js').util;
var mongo = require('mongodb');
var memcache = require('memcache');
var ATTicketAvail = require('../../../lib/services/at-ticket-avail.js').ATTicketAvail;
var testing = require('testing');

/**
 * A parser for TicketAvailRQ. Connects to Atlas, makes a query,
 * and stores the results in the different databases.
 * queryParameters: the parameters of the query to be launched
 * testing: is testing mode
 */
 exports.TicketAvailParser = function (queryParameters, testing) {
 	// self-reference
	var self = this;
	//some handy vars
	var destinationCode = queryParameters.Destination_code;
	var language = queryParameters.Language;
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
	 	var ticketAvailRQ = new ATTicketAvail(queryParameters, ticketAvailMap, "ServiceTicket");
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
		var server = new mongo.Server("127.0.0.1", mongo.Connection.DEFAULT_PORT, {});
		log.info("db listening on port: " + mongo.Connection.DEFAULT_PORT);
		var dbname = testing ? "mashooptest" : "mashoop"
		var db = new mongo.Db(dbname, server, {w:1});
		//update mongo in waterfall
		async.waterfall ([
			//Open db
			function (callback) {
				db.open(function(error, db) {
					callback(error, db);
				});
			},
			//open collection
			function (db, callback) {
				db.collection('tickets', callback);
			},
			//perform update
			function (collection, callback) {
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
					var pushItem = {};
					pushItem["imageList"] = {'$each': ticket["imageList"]};
					pushItem["availableModalityList"] = {'$each': ticket["availableModalityList"]};
					pushItem["descriptionList."+language] = {'$each': ticket["descriptionList"]};
					//Find the item, reuse the id, and update it
					async.waterfall([
						//find the item
						function (callback) {
							log.info("find the item");
							collection.findOne({destinationCode: destinationCode, code:ticket.code}, function(error, retrievedTicket) {
								callback(error, retrievedTicket)
							});
						},
						//set and unset
						function (retrievedTicket, callback) {
							log.info("set and unset");
							setItem["id"] = retrievedTicket ? retrievedTicket.id : util.randomString(util.mongoIdLength);
							setItem["created"] = retrievedTicket ? retrievedTicket.created : new Date();
							setItem["lastUpdated"] = retrievedTicket ? new Date() : setItem["created"];
							collection.update({code: ticket['code']},
								{'$set': setItem, '$unset': unsetItem},
								{upsert: true}, function(error) {
									callback (error);
								});
						},
						//push
						function (callback) {
							log.info("push");
							collection.update({code: ticket['code']},
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
							countTickets++:
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
			}],
			//Callback from main waterfall
			function (error, parsedTickets) {
				callback (error, parsedTickets);
			}
		);
	}

	return self;
 }

 /***********************************
 ************ UNIT TESTS ***********
 ***********************************/
function testTicketAvailParser(callback) {
 	//delete test mongo and memcache
 	var db = new mongo.Db('mashooptest', new mongo.Server("127.0.0.1", mongo.Connection.DEFAULT_PORT, {}), {w:1});
 	async.waterfall ([
 		//Open db
 		function(asyncCallback) {
 			log.info("about to open db");
 			db.open(function(error,db){
 				log.info("opened db");
 				asyncCallback(error, db);
 			});
 		},
 		//Open collection
 		function (db, asyncCallback) {
 			log.info("db: " + db);
 			db.collection('tickets', asyncCallback);
 		},
 		//Remove all elements from collection
 		function (collection, asyncCallback) {
 			log.info("collection: " + collection);
 			collection.remove({}, function (error, numberRemoved){
 				log.info("removed: " + numberRemoved + ". Error: " + error);
 				asyncCallback (error, collection);
 			});
 		},
 		//Call parseTickets with ENG
 		function (collection, asyncCallback) {
 			var queryParameters = {
		 		PaginationData_itemsPerPage: "2000",
		 		Language: "ENG",
		 		Destination_code: "BCN"
		 	};
		 	var ticketAvailParser = new exports.TicketAvailParser(queryParameters, /*testing*/ true);
		 	ticketAvailParser.parseTickets(function (error, parsedTicketsENG) {
		 		log.info("callback from parseTicketsENG");
		 		var parsedTickets = {ENG: parsedTicketsENG};
		 		asyncCallback (error, collection, parsedTickets);
		 	});
 		},
 		//Call parseTickets with CAS
 		function (collection, parsedTickets, asyncCallback) {
 			var queryParameters = {
		 		PaginationData_itemsPerPage: "2000",
		 		Language: "CAS",
		 		Destination_code: "BCN"
		 	};
		 	var ticketAvailParser = new exports.TicketAvailParser(queryParameters, /*testing*/ true);
		 	ticketAvailParser.parseTickets(function (error, parsedTicketsCAS) {
		 		log.info("callback from parseTicketsCAS");
		 		parsedTickets["CAS"] = parsedTicketsCAS;
		 		asyncCallback (error, collection, parsedTickets);
		 	});
 		},
 		//Count tickets ENG
 		function (collection, parsedTickets, asyncCallback) {
 			var countQuery = {};
			countQuery["destinationCode"] = "BCN";
			countQuery["name.ENG"] = {"$exists": true};
			countQuery["descriptionList.ENG"] = {"$exists": true};
			collection.count(countQuery, function (error, mongoCountENG) {
				var mongoCount = {ENG: mongoCountENG}
				asyncCallback (error, collection, parsedTickets, mongoCount);
			});
 		},
 		//Count tickets CAS
 		function (collection, parsedTickets, mongoCount, asyncCallback) {
 			var countQuery = {};
			countQuery["destinationCode"] = "BCN";
			countQuery["name.CAS"] = {"$exists": true};
			countQuery["descriptionList.CAS"] = {"$exists": true};
			collection.count(countQuery, function (error, mongoCountCAS) {
				mongoCount["CAS"] = mongoCountCAS;
				asyncCallback (error, parsedTickets, mongoCount);
			});
 		},
 		//perform tests and close db
 		function (parsedTickets, mongoCount, asyncCallback) {
 			log.info("entered last step");
 			log.info("parsedTickets: " + JSON.stringify(parsedTickets));
 			log.info("mongoCount: " + JSON.stringify(mongoCount));
 			for (var key in parsedTickets) {
 				testing.assertEquals(mongoCount[key], parsedTickets[key], "Didn't store all the parsed tickets in mongo for " + key, callback);
 			}
 			//testing.assertEquals(countTickets[1], parsedTickets[1], "Didn't store all the parsed tickets in memcached", callback);
 			db.close (true, asyncCallback);
 		}
 		],
 		//callback from waterfall
 		function (error) {
 			log.info("Entered test waterfall callback")
 			testing.assertEquals(error, null, "An error occured in the waterfal test process: " + JSON.stringify(error), callback);
 			testing.success(callback);
 		}
 	);
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



