'use strict';
/*
 * TuiInnovation nodejs.
 * Ajax async calls.
 *
 * Copyright (C) 2013 TuiInnovation.
 */

/**
 * object to encapsulate Ajax globals and functions.
 */
var ajax = new function()
{
	// self-reference
	var self = this;

	//requires
	var httpRequest = require('request');
	var log = require('../util/log.js');

	/**
	 * Function to submit data using Ajax, with instrumentation.
	 * ok: function to call with data after a success.
	 * nok: function to call with error object after a failure.
	 */
	self.send = function(data, url, ok, nok, method)
	{
		var requestMethod = method === 'POST' ? httpRequest.post : httpRequest.get;
		requestMethod (url, {form:data}, processResponse);
		function processResponse(error, httpResponse, body) {
			if (error) { //there was an error
				log.info("Error for url " + url + ": " + JSON.stringify(error));
				nok({error:error, statusCode:500});
			} else { //No error, let's look at the statusCode
				log.info ("received response from server: " + httpResponse.statusCode);
				if (httpResponse.statusCode != 200) {
					nok({error:body, statusCode:httpResponse.statusCode});
				} else {
					//Check if the error is coded in the response
					log.info ("sending OK response");
					ok(body);
				}
			}
		}

		/*if (method === 'POST') {
			httpRequest.post(url, {form:data}, processResponse);	
		} else {  //GET method
			log.info("calling GET: " + url);
			httpRequest.get(url, {form:data}, processResponse);
		}*/
	}

}

module.exports = ajax;
