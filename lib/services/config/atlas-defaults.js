'use strict';
/*
 * Atlas defaults for requests .
 *
 * Copyright (C) 2013 TuiInnovation.
 */
//requires
var core = require("../../util/core.js");
var config = require("../../config.js");
// error
exports.errorDescriptionMap = [
	{'ErrorList.Error': ["Code", "Timestamp", "Message", "DetailedMessage"]}];
// ticketAvail request
exports.ticketAvailRequest = {
	echoToken: function(){return core.randomString(config.echoTokenLength)},
	sessionId: function(){return core.randomString(config.sessionIdLength)},
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
		return core.atlasDate (date);
	},
	DateTo_date: function(){
		var date = new Date();
		date.setDate(date.getDate() + 1);
		return core.atlasDate (date);
	}
};
exports.ticketAvailDescriptionMap = [
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
exports.ticketAvailTag = '';
// hotelList request
exports.hotelListRequest = {
	echoToken: function(){return core.randomString(config.echoTokenLength)},
	Language: "ENG",
	Credentials_User: "ISLAS",
	Credentials_Password: "ISLAS",
	Destination_code: "PMI",
};
exports.hotelListDescriptionMap = [
	{'TotalItems':'@totalItems'},
	{'Hotel':['Code',
		'Name',
		{'DescriptionList.Description':[{'Type': '@type'},
						 				{'Description': ''}]},
		{'ImageList.Image': [{'Type': 'Type'},
							{'Url': 'Url'}]}
	]}
];
exports.hotelListTag = '';
// hotelDetail request
exports.hotelDetailRequest = {
	echoToken: function(){return core.randomString(config.echoTokenLength)},
	Language: "ENG",
	Credentials_User: "ISLAS",
	Credentials_Password: "ISLAS",
	HotelCode: "133932",
};
exports.hotelDetailDescriptionMap = [
	'Code',
	'Name',
	{'DescriptionList.Description':[{'Type': '@type'},
						 			{'Description': ''}]},
	{'ImageList.Image': [{'Type': 'Type'},
						{'Url': 'Url'},
						{'Description': 'Description'}]},
	{'Latitude': 'Position.@latitude'},
	{'Longitude': 'Position.@longitude'}
];
exports.hotelDetailTag = 'Hotel';
