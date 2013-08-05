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
	var ParametrizedString = require('../io/ParametrizedString.js');
	var XmlReader = require('../io/XmlReader.js');
	var ajax = require('../io/ajax.js');
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
	 * ok: callback in case of ok
	 * nok: callback in case of not ok
	 */
	self.sendRequest = function(ok, nok) {
		var parametrizedRequest = new ParametrizedString(atlas.ticketAvailRequest, queryParameters);
		var data = {xml_request: parametrizedRequest.replaceAllClean()};
		ajax.send(data, atlas.url, checkForErrors, nok, 'POST');
		/**
		 * Checks for errors in the body of the response
		 */
		function checkForErrors(data) {
			var errors = null;
			log.info("parsing errors ...");
			var errorReader = new XmlReader (data, atlasDefaults.errorDescriptionMap);
			errorReader.readObjects(function(parsedErrors){
				errors = parsedErrors;
			});
			while (errors === null){}
			if ("ErrorList" in errors) {	//There were errors coded in the response
				nok({error:errors.ErrorList, statusCode:400});
			} else {
				var result = null;
				var callback = ok;
				log.info("No errors. Parsing response ...");
				var xmlReader = new XmlReader (data, descriptionMap, tag);
				xmlReader.readObjects(function(parsedResponse){
					if (parsedResponse === null) { //something went wrong when parsing
						result = {error:"Parsing error. XmlReader returned null", statusCode:500};
						callback = nok;
					} else {
						result = parsedResponse;
					}
				});
				while (result === null){}
				callback(result);
			}
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

module.exports = ATTicketAvail;
