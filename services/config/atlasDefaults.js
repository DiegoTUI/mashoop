'use strict';
/*
 * Atlas defaults for requests .
 *
 * Copyright (C) 2013 TuiInnovation.
 */

var util = require("../../util/util.js");

/**
 * Pseudo-global to store Atlas defaults for requests
 */
var atlasDefaults = {};

//error description map
atlasDefaults["errorDescriptionMap"] = [
	{'ErrorList.Error': ["Code", "Timestamp", "Message", "DetailedMessage"]}];

//ticketAvailRequest
atlasDefaults["ticketAvailRequest"] = {
		echoToken: function(){return util.randomString(util.echoTokenLength)},
		sessionId: function(){return util.randomString(util.sessionIdLength)},
		Language: "ENG",
		Credentials_User: "ISLAS",
		Credentials_Password: "ISLAS",
		PaginationData_itemsPerPage: "50",
		PaginationData_pageNumber: "1",
		ServiceOccupancy_AdultCount: "1",
		ServiceOccupancy_ChildCount: "0",
		Destination_code: "PMI",
		DateFrom_date: function(){
			var date = new Date();
			return util.atlasDate (date);
		},
		DateTo_date: function(){
			var date = new Date();
			date.setDate(date.getDate() + 1);
			return util.atlasDate (date);
		}
	};
atlasDefaults["ticketAvailDescriptionMap"] = [
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
atlasDefaults["ticketAvailTag"] = '';

//export module
module.exports = atlasDefaults;