'use strict';
/*
 * Atlas defaults for requests .
 *
 * Copyright (C) 2013 TuiInnovation.
 */
//requires
var core = require("../../util/core.js");
var config = require("../../config.js");
// constants
var XMLNS = 'http://www.hotelbeds.com/schemas/2005/06/messages';
var XMLNS_XSI = 'http://www.w3.org/2001/XMLSchema-instance';
var XSI_SCHEMALOCATION_BASE = 'http://www.hotelbeds.com/schemas/2005/06/messages ';
// error
exports.errorDescriptionMap = [
	{'ErrorList.Error': ["Code", "Timestamp", "Message", "DetailedMessage"]}];
// ticketAvail request
exports.ticketAvailRequest = {
	echoToken: function(){return core.randomString(config.echoTokenLength)},
	sessionId: function(){return core.randomString(config.sessionIdLength)},
	xmlns: XMLNS,
	'xmlns:xsi': XMLNS_XSI,
	'xsi:schemaLocation': XSI_SCHEMALOCATION_BASE + 'TicketAvailRQ.xsd', 
	language: "ENG",
	user: "ISLAS",
	password: "ISLAS",
	pageSize: "50",
	page: "1",
	adults: "1",
	children: "0",
	destination: "PMI",
	destinationType: "SIMPLE",
	from: function(){
		var date = new Date();
		return core.atlasDate (date);
	},
	to: function(){
		var date = new Date();
		date.setDate(date.getDate() + 1);
		return core.atlasDate (date);
	}
};
exports.ticketAvailDescriptionMap = [
	{'TotalItems':'@totalItems'},
	{'EchoToken': '@echoToken'},
	{'ServiceTicket':
		[{'AvailToken':'@availToken'},
		{'DateFrom':'DateFrom.@date'},
		{'DateTo':'DateTo.@date'},
		'Currency',
		{'CurrencyCode': 'Currency.@code'},
		{'Code': 'TicketInfo.Code'},
		{'Name': 'TicketInfo.Name'},
		{'TicketInfo.DescriptionList.Description':[{'Type': '@type'},
						 			{'Description': ''}]},
		{'TicketInfo.ImageList.Image': [{'Type': 'Type'},
								{'Url': 'Url'}]}
		]}
];
exports.ticketAvailTag = '';
// ticketValuation request
exports.ticketValuationRequest = {
	echoToken: function(){return core.randomString(config.echoTokenLength)},
	xmlns: XMLNS,
	'xmlns:xsi': XMLNS_XSI,
	'xsi:schemaLocation': XSI_SCHEMALOCATION_BASE + 'TicketValuationRQ.xsd', 
	language: "ENG",
	user: "ISLAS",
	password: "ISLAS",
	adults: "1",
	children: "0",
	availToken: "INVALID_AVAIL_TOKEN",
	from: function(){
		var date = new Date();
		return core.atlasDate (date);
	},
	to: function(){
		var date = new Date();
		date.setDate(date.getDate() + 1);
		return core.atlasDate (date);
	},
	ticket: "000200515",
	modality: "0#8"
};
exports.ticketValuationDescriptionMap = [
	{'EchoToken': '@echoToken'},
	{'ServiceTicket':
		[{'SPUI':'@SPUI'},
		{'CommentList.Comment':[{'Type': '@type'},
								{'Comment': ''}]},
		{'AdditionalCostList.AdditionalCost': [{'Type': '@type'},
												{'Amount': 'Price.Amount'}]},
		{'AvailableModality':[{'Code': '@code'},
								{'Name': 'Name'},
								{'ContractName': 'Contract.Name'},
								{'IncomingOfficeCode': 'IncomingOffice.@code'},
								{'Pricelist.Price':[{'Amount': 'Amount'},
													{'Description': 'Description'}]}
							]
		},
		{'Adults':'Paxes.AdultCount'},
		{'Children':'Paxes.ChildCount'},
		{'Paxes.GuestList.Customer': [{'Type': '@type'},
										{'Age': 'Age'}]},
		{'CancellationPolicyList':[{'Price': [{'Amount':'Amount'},
												{'From': 'DateTimeFrom.@date'},
												{'To': 'DateTimeTo.@date'}
											]
									}]
		},
		{'ServiceDetailList.ServiceDetail':[{'Code': '@code'},
											{'Name': 'Name'}]}
	]}
];
exports.ticketValuationTag = '';
// hotelList request
exports.hotelListRequest = {
	echoToken: function(){return core.randomString(config.echoTokenLength)},
	xmlns: XMLNS,
	'xmlns:xsi': XMLNS_XSI,
	'xsi:schemaLocation': XSI_SCHEMALOCATION_BASE + 'HotelListRQ.xsd', 
	language: "ENG",
	user: "ISLAS",
	password: "ISLAS",
	destination: "PMI",
	destinationType: "SIMPLE"
};
exports.hotelListDescriptionMap = [
	{'TotalItems':'@totalItems'},
	{'EchoToken': '@echoToken'},
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
	xmlns: XMLNS,
	'xmlns:xsi': XMLNS_XSI,
	'xsi:schemaLocation': XSI_SCHEMALOCATION_BASE + 'HotelDetailRQ.xsd', 
	language: "ENG",
	user: "ISLAS",
	password: "ISLAS",
	hotel: "133932",
};
exports.hotelDetailDescriptionMap = [
	{'EchoToken': '@echoToken'},
	{'Code':'Hotel.Code'},
	{'Name':'Hotel.Name'},
	{'Hotel.DescriptionList.Description':[{'Type': '@type'},
						 			{'Description': ''}]},
	{'Hotel.ImageList.Image': [{'Type': 'Type'},
						{'Url': 'Url'},
						{'Description': 'Description'}]},
	{'Latitude': 'Hotel.Position.@latitude'},
	{'Longitude': 'Hotel.Position.@longitude'}
];
exports.hotelDetailTag = '';
