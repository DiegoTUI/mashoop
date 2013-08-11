'use strict';

/**
 * A parser for TicketAvailRQ. Connects to Atlas, makes a query,
 * and stores the results in the different databases.
 */
 var TicketAvailParser = function (testing) {
 	// self-reference
	var self = this;
	//requires
	var async = require('async');
	var ATTicketAvail = require('../lib/services/at-ticket-avail.js').ATTicketAvail;
	var log = require('../lib/util/log.js');
	var memcache = require('memcache');
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
	 * queryParameters: the parameters of the query to be launched
	 * callback: a function (error, result) to call back when the parsing has finished
	 */
	self.parseTickets = function (queryParameters, callback) {
		var destinationCode = queryParameters.Destination_code;
		var language = queryParameters.Language;
	 	var ticketAvailRQ = new ATTicketAvail(queryParameters, ticketAvailMap, "ServiceTicket");
	 	log.info("Calling ATLAS for " + destinationCode + " in " + language);
	 	ticketAvailRQ.sendRequest(function (error, dataReceived) {
	 		if (error) {
	 			log.error('Error returned while calling ' + JSON.stringify(parameters) + ": " + JSON.stringify(error));
	 			callback(error);
	 			return;
	 		}
	 		log.info("Received " + dataReceived.length + " tickets for " + destinationCode + " in " + language);
			//update databases
			async.parallel([
				function (callback) {
					updateMongo(dataReceived, callback);
				},
				function (callback) {
					updateMemcache(dataReceived, callback);
				}],
				//Callback from parallel
				function (error, results) {
					if (error) {
						log.error('Error returned while updating DBs: ' + JSON.stringify(error));
	 					callback(error);
	 					return;
					}
					log.info("Databases updated correctly");
					callback(error, results);
				}
			);
	 	});
	}

	/**
	 * Update mongodb
	 * dataReceived: data received from ATTicketAvail
	 * callback(error,results): callback with the results of the updating
	 */
	function updateMongo(dataReceived, callback) {
		//the database
		var mongo = require('mongodb');
		var server = new mongo.Server("127.0.0.1", mongo.Connection.DEFAULT_PORT, {});
		log.info("db listening on port: " + mongo.Connection.DEFAULT_PORT);
		var dbname = testing ? "mashooptest" : "mashoop"
		var db = new mongo.Db(dbname, server, {w:1});
		//open database and collection
		async.series([
			db.open,
			function(callback) {
				db.collection(tickets, callback);
			}],
			//Callback from series
			function (error, results) {
				if (error) {
					log.error("error returned while trying to open the database or collection: " + JSON.stringify(error));
					callback(error);
					return;
				}
				//browse the tickets, update the db
				var totalTickets = dataReceived.length;
				var countParsedTickets = 0;
				dataReceived.forEach(function(ticket, index) {
					//Items to set and unset
					var setItem = {
						code: ticket['code'],
						currencyCode: ticket['currencyCode'],
						destinationCode: destinationCode,
						lastUpdated: new Date()
					};
					setItem["name."+language] = ticket.name;
					var unsetItem ={
						ImageList: 1,
						AvailableModalityList: 1
					};
					unsetItem["DescriptionList."+language] = 1;
					//Items to push
					var pushItem = {};
					pushItem["ImageList"] = {'$each': ticket["ImageList"]};
					pushItem["AvailableModalityList"] = {'$each': ticket["AvailableModalityList"]};
					pushItem["DescriptionList."+language] = {'$each': ticket["DescriptionList"]};
					//Set and unset first, then push
					async.series([
						function (callback) {
							collection.update({code: ticket['code']},
								{'$set': setItem, '$unset': unsetItem},
								{upsert: true}, callback);
						},
						function (callback) {
							collection.update({code: ticket['code']},
								{'$push': pushItem},
								{upsert: true}, callback);
						}],
						//callback for series
						function (error, result) {
							if (error) {
								log.error ("Error while updating mongo");
								callback(error);
								return;
							}
							//Update success, check if finished
							countParsedTickets++;
							if (countParsedTickets == totalTickets){
								callback(null, totalTickets);
							}
						}
					);
				});
			}
		);
	}

	/**
	 * Update memcahe
	 * dataReceived: data received from ATTicketAvail
	 * callback(error,results): callback with the results of the updating
	 */
	function updateMemcache(dataReceived, callback){
		callback(null,0);
	}

	return self;
 }

 exports.ticketAvailParser = ticketAvailParser;

 /***********************************
 ************ UNIT TESTS ***********
 ***********************************/
 var testing = require('testing');

 function testTicketAvailParser(callback) {
 	var queryParameters = {
 		PaginationData_itemsPerPage: "2000",
 		Language: "ENG",
 		Destination_code: "BCN"
 	};
 	//delete mongo and memcache

 	var ticketAvailParser = new TicketAvailParser(/*testing*/ true);
 	ticketAvailParser.parseTickets(queryParameters, function(error, result) {
 		testing.ok(error != null, "valid query to Atlas returned an error: " + JSON.stringify(error), callback);
 	});

 }

 exports.test = function(callback) {
	testing.run({
		testTicketAvailParser: testTicketAvailParser
	}, 100000, callback);
}

 // start tests if invoked directly
if (__filename == process.argv[1])
{
    exports.test(testing.show);
}



