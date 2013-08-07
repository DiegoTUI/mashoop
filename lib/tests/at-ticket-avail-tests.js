'use strict';
/**
 * TuiInnovation
 * TicketAvail unit tests
 *
 * Copyright (C) 2013 TuiInnovation.
 */

var TicketAvailRequest = require('../services/at-ticket-avail.js').ATTicketAvail;
var log = require('../util/log.js');

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
exports.testTicketAvailRequest = function (test) {
	test.expect(2);
	function atlasCallback(error, result) {
		test.ok(error === null, "Valid request to ATLAS returned an error: " + JSON.stringify(error));
		log.info("number of serviceTickets in the reply: " + result.ServiceTicketList.length);
		test.ok(result.ServiceTicketList.length == parseInt(result.TotalItems), "Wrong number of items retrieved. Should have retrieved " + result.TotalItems + " but the parsed array only has " + result.ServiceTicketList.length);
		test.done();
	}
	var parameters = {
		Language: "ENG",
		Credentials_User: "ISLAS",
		ServiceOccupancy_AdultCount: "1"
	};

	var ticketAvailRQ = new TicketAvailRequest(parameters, ticketAvailMapAlt);
	ticketAvailRQ.sendRequest(atlasCallback);
}

exports.testTicketAvailRequestNoDescriptionMap = function (test) {
	test.expect(2);
	function atlasCallback(error, result) {
		test.ok(error === null, "Valid request to ATLAS returned an error: " + JSON.stringify(error));
		log.info("number of serviceTickets in the reply: " + result.ServiceTicketList.length);
		test.ok(result.ServiceTicketList.length == parseInt(result.TotalItems), "Wrong number of items retrieved. Should have retrieved " + result.TotalItems + " but the parsed array only has " + result.ServiceTicketList.length);
		test.done();
	}
	var parameters = {
		Language: "ENG",
		Credentials_User: "ISLAS",
		ServiceOccupancy_AdultCount: "1"
	};

	var ticketAvailRQ = new TicketAvailRequest(parameters);
	ticketAvailRQ.sendRequest(atlasCallback);
}

exports.testTicketAvailRequestErrors = function (test) {
	test.expect(3);
	function atlasCallback(error, result) {
		test.ok(error != null, "Invalid request to ATLAS returned no errors.");
		test.ok(error.statusCode == 400, "wrong status code returned");
		log.info("number of errors in the reply: " + error.error.length);
		test.ok(error.error.length == 1, "Wrong number of errors retrieved.");
		test.done();
	}
	var parameters = {
		Language: "SPA",	//UNEXISTING LANGUAGE!!!
		Credentials_User: "ISLAS",
		ServiceOccupancy_AdultCount: "1"
	};

	var ticketAvailRQ = new TicketAvailRequest(parameters);
	ticketAvailRQ.sendRequest(atlasCallback);
}

exports.testTicketAvailRequestWrongTag = function (test) {
	test.expect(3);
	function atlasCallback(error, result) {
		test.ok(error != null, "Invalid tag request to ATLAS returned no errors.");
		test.ok(error.statusCode == 500, "wrong status code returned");
		test.ok(error.error === "XML_PARSING_ERROR", "wrong error returned");
		test.done();
	}
	var parameters = {
		Language: "ENG",
		Credentials_User: "ISLAS",
		ServiceOccupancy_AdultCount: "1"
	};

	var ticketAvailRQ = new TicketAvailRequest(parameters, ticketAvailMap, "WrongTag");
	ticketAvailRQ.sendRequest(atlasCallback);
}