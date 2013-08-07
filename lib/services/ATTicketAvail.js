'use strict';
/*
 * TuiInnovation nodejs.
 * ATTicketAvail: performs a TicketAvail request to ATLAS and resturns the results
 *
 * Copyright (C) 2013 TuiInnovation.
 */

 var log = require('../util/log.js');

/**
 * The TicketAvail request in Atlas.
 * queryParameters: the parameters to build the xml and perform the call
 * descriptionMap: the json describing wich fields you want to read from the xml
 * tag: the tag to indicate which objects in the xml should we look for. Root if undefined or null
 */
var ATTicketAvail = function(queryParameters, descriptionMap, tag)
{
	// self-reference
	var self = this;

	//requires
	var ParametrizedString = require('../io/ParametrizedString.js').ParametrizedString;
	var XmlReader = require('../io/XmlReader.js');
	var ajax = require('../io/ajax.js').ajax;
	var util = require('../util/util.js');
	var atlas = require('./config/atlas.js');
	var atlasDefaults = require('./config/atlasDefaults.js');

	//Initialize query parameters
	initQueryParams();
	descriptionMap = descriptionMap ? descriptionMap: atlasDefaults.ticketAvailDescriptionMap;
	tag = tag ? tag : atlasDefaults.ticketAvailTag;

	/**
	 * Sends the ajax request to the apropriate url with the right xml and query parameters
	 * callback follows the function(error, result) nodejs convention
	 */
	self.sendRequest = function(callback) {
		var parametrizedRequest = new ParametrizedString(atlas.ticketAvailRequest, queryParameters);
		var form = {xml_request: parametrizedRequest.replaceAllClean()};
		var options = {
			url: atlas.url,
			form: form,
			method: "POST"
		};
		ajax.send(options, checkForErrors);

		/**
		 * Checks for errors in both the error parameter and the body of the response
		 */
		function checkForErrors(error, result) {
			//If there is an error, we return an error
			if (error) {
				callback(error);
				return;
			}
			//No errors in the error parameter, let's look in the response
			//var errors = null;
			log.info("parsing errors ...");
			var errorReader = new XmlReader (result, atlasDefaults.errorDescriptionMap);
			errorReader.readObjects(function(parsedErrors){
				//errors = parsedErrors;
				if ("ErrorList" in parsedErrors) {	//There were errors coded in the response
					callback({error:parsedErrors.ErrorList, statusCode:400});
				} else {
					//var result = null;
					log.info("No errors. Parsing response ...");
					var xmlReader = new XmlReader (result, descriptionMap, tag);
					xmlReader.readObjects(function(parsedResponse){
						if (parsedResponse === null) { //something went wrong when parsing
							callback({error:"XML_PARSING_ERROR", statusCode:500});
							//result = {error:"Parsing error. XmlReader returned null", statusCode:500};
							//callback = nok;
						} else {
							//result = parsedResponse;
							callback(null, parsedResponse);
						}
					});
					//while (result === null){}
					//callback(result);
				}
			});
			//while (errors === null){}
		}
	}

	/**
	 * Check the query parameters and creates (if needed) some of the compulsory fields
	 */
	function initQueryParams() {
		for (var key in atlasDefaults.ticketAvailRequest) {
			if (!(key in queryParameters)){
				queryParameters[key] = typeof atlasDefaults.ticketAvailRequest[key] === "function" ?
											atlasDefaults.ticketAvailRequest[key]() : atlasDefaults.ticketAvailRequest[key];
			}
		}
	}

	return self;
}

exports.ATTicketAvail = ATTicketAvail;

/***********************************
 ************ UNIT TESTS ***********
 ***********************************/
 var testing = require('testing');

var ticketAvailMap = [
{'DateFrom':'DateFrom.@date'},
{'DateTo':'DateTo.@date'},
'Currency',
{'CurrencyCode': 'Currency.@code'},
{'Name': 'TicketInfo.Name'},
{'TicketInfo.DescriptionList.Description':[{'Type': '@type'},
					 			{'Description': ''}]},
{'TicketInfo.ImageList.Image': [{'Type': 'Type'},
							{'Url': 'Url'}]}];

var ticketAvailMapAlt = [
{'TotalItems':'@totalItems'},
{'ServiceTicket':[{'DateFrom':'DateFrom.@date'},
	{'DateTo':'DateTo.@date'},
	'Currency',
	{'CurrencyCode': 'Currency.@code'},
	{'Name': 'TicketInfo.Name'},
	{'TicketInfo.DescriptionList.Description':[{'Type': '@type'},
					 			{'Description': ''}]},
	{'TicketInfo.ImageList.Image': [{'Type': 'Type'},
							{'Url': 'Url'}]}
	]}
];

/* run tests */
function testTicketAvailRequest (callback) {
	function atlasCallback(error, result) {
		testing.assert(error === null, "Valid request to ATLAS returned an error: " + JSON.stringify(error), callback);
		log.info("number of serviceTickets in the reply: " + result.ServiceTicketList.length);
		testing.assertEquals(result.ServiceTicketList.length, parseInt(result.TotalItems), "Wrong number of items retrieved. Should have retrieved " + result.TotalItems + " but the parsed array only has " + result.ServiceTicketList.length, callback);
		testing.success(callback);
	}
	var parameters = {
		Language: "ENG",
		Credentials_User: "ISLAS",
		ServiceOccupancy_AdultCount: "1"
	};

	var ticketAvailRQ = new ATTicketAvail(parameters, ticketAvailMapAlt);
	ticketAvailRQ.sendRequest(atlasCallback);
}

function testTicketAvailRequestNoDescriptionMap (callback) {
	function atlasCallback(error, result) {
		testing.assert(error === null, "Valid request to ATLAS returned an error: " + JSON.stringify(error), callback);
		log.info("number of serviceTickets in the reply: " + result.ServiceTicketList.length);
		testing.assertEquals(result.ServiceTicketList.length, parseInt(result.TotalItems), "Wrong number of items retrieved. Should have retrieved " + result.TotalItems + " but the parsed array only has " + result.ServiceTicketList.length, callback);
		testing.success(callback);
	}
	var parameters = {
		Language: "ENG",
		Credentials_User: "ISLAS",
		ServiceOccupancy_AdultCount: "1"
	};

	var ticketAvailRQ = new ATTicketAvail (parameters);
	ticketAvailRQ.sendRequest(atlasCallback);
}

function testTicketAvailRequestErrors (callback) {
	function atlasCallback(error, result) {
		testing.assert(error != null, "Invalid request to ATLAS returned no errors.", callback);
		testing.assertEquals(error.statusCode, 400, "wrong status code returned", callback);
		log.info("number of errors in the reply: " + error.error.length);
		testing.assertEquals(error.error.length, 1, "Wrong number of errors retrieved.", callback);
		testing.success(callback);
	}
	var parameters = {
		Language: "SPA",	//UNEXISTING LANGUAGE!!!
		Credentials_User: "ISLAS",
		ServiceOccupancy_AdultCount: "1"
	};

	var ticketAvailRQ = new ATTicketAvail(parameters);
	ticketAvailRQ.sendRequest(atlasCallback);
}

function testTicketAvailRequestWrongTag (callback) {
	function atlasCallback(error, result) {
		testing.assert(error != null, "Invalid tag request to ATLAS returned no errors.", callback);
		testing.assertEquals(error.statusCode, 500, "wrong status code returned", callback);
		testing.assertEquals(error.error, "XML_PARSING_ERROR", "wrong error returned", callback);
		testing.success(callback);
	}
	var parameters = {
		Language: "ENG",
		Credentials_User: "ISLAS",
		ServiceOccupancy_AdultCount: "1"
	};

	var ticketAvailRQ = new ATTicketAvail(parameters, ticketAvailMap, "WrongTag");
	ticketAvailRQ.sendRequest(atlasCallback);
}

 exports.test = function(callback) {
	testing.run({
		testTicketAvailRequest: testTicketAvailRequest,
		testTicketAvailRequestNoDescriptionMap: testTicketAvailRequestNoDescriptionMap,
		testTicketAvailRequestErrors: testTicketAvailRequestErrors,
		testTicketAvailRequestWrongTag: testTicketAvailRequestWrongTag
	}, 100000, callback);
}

 // start tests if invoked directly
if (__filename == process.argv[1])
{
    exports.test(testing.show);
}