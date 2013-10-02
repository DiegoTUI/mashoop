'use strict';
//requires
var async = require('async');
var Log = require('log');
var log = new Log();
//var log = require('../util/log.js');
var config = require('../config.js');
var db = require('../db.js');
var core = require('../util/core.js');
var ATTicketAvail = require('../services/at-ticket-avail.js').ATTicketAvail;
var testing = require('testing');
var JsonFormatter = require('../io/json-formatter.js').JsonFormatter;

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
	//Type map to define the non-string types to store in mongo
	var ticketAvailTypeMap = [
		{'availableModalityList': [{'priceList': [{'amount': 'float'}]},
									{'childAgeFrom': 'int'},
									{'childAgeTo': 'int'}]},
		{'imageList': [{'order': 'int'},
						{'visualizationOrder': 'int'}]}];
	/**
	 * Public method to start the parsing
	 * callback: a function (error, result) to call back when the parsing has finished
	 */
	self.parseTickets = function (callback) {
		db.addCallback(function(error, result) {
			if (error) {
				return callback(error);
			}
			ticketCollection = result.collection('tickets');
			readTickets(callback);
		});
	};

	/**
	 * Read tickets from Atlas.
	 */
	function readTickets(callback) {
		var ticketAvailRQ = new ATTicketAvail(queryParameters, ticketAvailMap, 'ServiceTicket', /*forceCall*/ true);
		log.debug('Calling ATLAS for ' + destinationCode + ' in ' + language);
		ticketAvailRQ.sendRequest(function (error, dataReceived) {
			if (error) {
				log.error('Error returned while calling ' + JSON.stringify(queryParameters) + ': ' + JSON.stringify(error));
				callback(error);
				return;
			}
			log.debug('Received ' + dataReceived.length + ' tickets for ' + destinationCode + ' in ' + language);
			//update mongo
			updateMongo(dataReceived, function (error, parsedTickets) {
				if (error) {
					log.error('Error returned while updating Mongo: ' + JSON.stringify(error));
					callback(error);
					return;
				}
				log.debug('Mongo updated correctly');
				callback(error, parsedTickets);
			});
		});
	}

	function updateMongo(dataReceived, callback) {
		//browse the tickets, update the db
		var countTickets = 0;
		dataReceived.forEach(function(ticket) {
			//Decapitalize ticket keys
			ticket = core.decapitalizeKeys(ticket);
			//format types
			var jsonFormatter = new JsonFormatter(ticket, ticketAvailTypeMap);
			ticket = jsonFormatter.formatJson();
			//Items to set and unset
			var setItem = {
				code: ticket.code,
				currencyCode: ticket.currencyCode,
				destinationCode: destinationCode
			};
			setItem['name.'+language] = ticket.name;
			var unsetItem ={
				imageList: 1,
				availableModalityList: 1
			};
			unsetItem['descriptionList.'+language] = 1;
			//Items to push
			var pushItem = {
				imageList: {'$each': ticket.imageList},
				availableModalityList: {'$each': ticket.availableModalityList},
			};
			pushItem['descriptionList.' + language] = {'$each': ticket.descriptionList};
			//Find the item, reuse the id, and update it
			async.waterfall([
			//find the item
			function (callback) {
				ticketCollection.findOne({destinationCode: destinationCode, code:ticket.code}, function(error, retrievedTicket) {
					callback(error, retrievedTicket);
				});
			},
			//set and unset
			function (retrievedTicket, callback) {
				setItem.id = retrievedTicket ? retrievedTicket.id : core.randomString(config.mongoIdLength);
				setItem.created = retrievedTicket ? retrievedTicket.created : new Date();
				setItem.lastUpdated = retrievedTicket ? new Date() : setItem.created;
				ticketCollection.update({code: ticket.code},
				{'$set': setItem, '$unset': unsetItem},
				{upsert: true}, function(error) {
					callback (error);
				});
			},
			//push
			function (callback) {
				ticketCollection.update({code: ticket.code},
				{'$push': pushItem},
				{upsert: true}, callback);
			}],
			//callback for inner waterfall
			function (error/*, result*/) {
				if (error) {
					log.error ('Error while updating mongo');
					return callback(error);
				}
				countTickets++;
				//Update success, check if finished
				if (dataReceived.length == countTickets) {
					callback (error, dataReceived.length);
				}
			});
		});
	}

	return self;
};

/***********************************
 ************ UNIT TESTS ***********
 ***********************************/
function testTicketAvailParser(callback) {
	config.mongoConnection = 'mongodb://127.0.0.1:27017/mashooptest';
	db.reconnect(function() {
		var ticketCollection = db.getCollection('tickets');
		ticketCollection.remove({}, function(/*error, result*/) {
			var languages = ['ENG', 'CAS'];
			var series = {};
			languages.forEach(function(language) {
				series[language] = getParserCounter(ticketCollection, language);
			});
			async.series(series, function(error/*, result*/) {
				testing.check(error, callback);
				testing.success('Ticket avail parser success', callback);
			});
		});
	});
}

/**
 * Get a function to parse tickets and count them, then compare them.
 */
function getParserCounter(ticketCollection, language) {
	return function(callback) {
		var queryParameters = {
			pagesize: '2000',
			language: language,
			destination: 'BCN'
		};
		var ticketAvailParser = new exports.TicketAvailParser(queryParameters);
		ticketAvailParser.parseTickets(function (error, parsedTickets) {
			testing.check(error, 'Could not parse tickets', callback);
			var countQuery = {
				destinationCode: 'BCN',
			};
			countQuery['name.' + language] =  {'$exists': true};
			countQuery['descriptionList.' + language] = {'$exists': true};
			ticketCollection.count(countQuery, function (error, mongoCount) {
				testing.check(error, 'Could not count tickets', callback);
				testing.assertEquals(mongoCount, parsedTickets, 'Didn\'t store all the parsed tickets in mongo for ' + language, callback);
				callback(null, true);
			});
		});
	};
}

exports.test = function(callback) {
	//change log object
	log = require('../util/log.js');
	testing.run({
		testTicketAvailParser: testTicketAvailParser
	}, 100000, function (error, result) {
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

