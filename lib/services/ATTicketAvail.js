'use strict';
/*
 * TuiInnovation nodejs.
 * ATTicketAvail: performs a TicketAvail request to ATLAS and resturns the results
 *
 * Copyright (C) 2013 TuiInnovation.
 */

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
	var log = require('../util/log.js');
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
