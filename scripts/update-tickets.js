'use strict';
/**
 * Script to query ATLAS about tickets in certain destinations 
 * and update collection tickets in tuiinnovation db.
 * Usage: node update-ticket.js [destination_code]
 */

/**
 * Requirements.
 */
var mongo = require('mongodb');
var fs = require('fs');
var path = require('path');
var ATTicketAvail = require('../services/ATTicketAvail.js');
var log = require('../util/log.js');
var util = require('../util/util.js');
var atlas = require('../services/config/atlas.js');
var atlasDefaults = require('../services/config/atlasDefaults.js');

/**
 * Constants.
 */
process.title = 'update-tickets';
/**
 * Process uncaught exceptions.
 */
process.on('uncaughtException', function(err) {
	log.error("We found an uncaught exception.");
	log.error(err.stack);
});
/**
 * Globals.
 */
var server = new mongo.Server("127.0.0.1", mongo.Connection.DEFAULT_PORT, {});
log.info("db listening on port: " + mongo.Connection.DEFAULT_PORT);
var db = new mongo.Db("tuiinnovation", server, {w:1});
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
var removed = {};

/**
 * Connect and parse
 */
 function parseTickets (parameters, collection, finished) {

 	function ok(result) {
		log.info("Received " + result.length + " tickets for " + destinationCode + " in " + language);
		//check if I have to remove the elements of the collection
		if (removed[destinationCode]) { //already removed, just update DB
			updateDB(result);
		} else { //remove first, then update
			collection.remove({destinationCode:destinationCode}, function(error,numberRemoved){
				if (error) {
					log.error ("Error while removing for destination: " + destinationCode);
					throw error;
				}
				log.info("Removed " + numberRemoved + " elements for destination " + destinationCode + ". Removed is: " + removed[destinationCode]);
				removed[destinationCode] = true;
				updateDB(result);
			});
		}
	}

	function nok(result) {
		var message = 'Error returned while calling: ' + JSON.stringify(parameters) + '. Status code: ' + result.statusCode;
		if (error)
			message += '. Error: ' + JSON.stringify(result.error);
		log.error(message)
	}

	function updateDB(result) {
		//browse the tickets, update the db
		var totalTickets = result.length;
		var countParsedTickets = 0;
		result.forEach(function(ticket, index) {
			//First update the "simple" fields and remove the arrays
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
			collection.update({code: ticket['code']},
				{'$set': setItem, '$unset': unsetItem},
				{upsert: true}, function(error, count){
					if (error) {
						log.error ("Error while updating set and unset");
						throw error;
					}
					//log.info("Set and unset " + count + " elements for index " + index);
					//Now push the new arrays
					var pushItem = {};
					pushItem["ImageList"] = {'$each': ticket["ImageList"]};
					pushItem["AvailableModalityList"] = {'$each': ticket["AvailableModalityList"]};
					pushItem["DescriptionList."+language] = {'$each': ticket["DescriptionList"]};
					collection.update({code: ticket['code']},
						{'$push': pushItem},
						{upsert: true}, function (error, count){
							if (error) {
								log.error ("Error while updating push");
								throw error;
							}
							//log.info("Push " + count + " elements for index" + index);
							//log.info("Finished parsing ticket " + index);
							countParsedTickets++;
							if (countParsedTickets == totalTickets){
								finished(totalTickets);
							}
					});
				});
		});
	}

	var destinationCode = parameters.Destination_code;
	var language = parameters.Language;
 	var ticketAvailRQ = new ATTicketAvail(parameters, ticketAvailMap, "ServiceTicket");
 	log.info("Calling ATLAS for " + destinationCode + " in " + language);
 	ticketAvailRQ.sendRequest(ok,nok);
 }

/**
 * ----SCRIPT STARTS HERE----
 */
var languages = JSON.parse(fs.readFileSync(path.resolve(__dirname, "languages.json")));
var destinations = JSON.parse(fs.readFileSync(path.resolve(__dirname, "destinations.json")));
var queryParameters = {
 	PaginationData_itemsPerPage: "2000"
};
//set the dates
var date = new Date();
queryParameters["DateFrom_date"] = util.atlasDate(date); 
date.setDate(date.getDate() + 7);
queryParameters["DateTo_date"] = util.atlasDate(date); 
//Open database
db.open(function(error,db) {
	if (error) {
		log.error("error returned while trying to open the database: " + JSON.stringify(error));
		throw error;
	}
	db.collection("tickets", function(error,collection) {
		if (error) {
			log.error("error returned while trying to open tickets collection: " + JSON.stringify(error));
			throw error;
		}
		//For each destination and language
		var steps = destinations.length * languages.length;
		var currentStep = 0;
		destinations.forEach(function(destination){
			languages.forEach(function(language){
				queryParameters["Language"] = language;
				queryParameters["Destination_code"] = destination;
				log.info("About to parse " + destination + " and " + language);
				parseTickets(queryParameters, collection, function(totalTickets) {
					log.info("Parsed " + totalTickets + " tickets for " + destination + " and " + language);
					//perform integrity test
					var countQuery = {};
					countQuery["destinationCode"] = destination;
					countQuery["name." + language] = {"$exists": true};
					countQuery["DescriptionList." + language] = {"$exists": true};
					collection.count(countQuery, function(error, count){
						if (error) {
							log.error("error returned while counting for destination " + destination + " and language " + language + ": " + JSON.stringify(error));
						}
						if (count != totalTickets) {
							log.error("INTEGRITY TEST FAILED!!! Destination: " + destination + ". Language: " + language + ". TotalTickets: " + totalTickets + ". Count: " + count);
						} else {
							log.info("Passed integrity test. Destination: " + destination + ". Language: " + language);
						}
						currentStep++;
						if (currentStep == steps){
							//close database and exit
							db.close(true, function(error, result){
								if (error) {
									log.error("error returned while trying to open tickets collection: " + JSON.stringify(error));
									throw error;
								}
								process.exit();
							});
					 	}
					});
				});
			});
		});
	});
});



