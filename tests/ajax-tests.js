'use strict';
/**
 * TuiInnovation
 * Ajax unit tests
 *
 * Copyright (C) 2013 TuiInnovation.
 */


/* run tests */
exports.offlineTest = function (test) {
	test.expect(1);
	function ok(result) {
		test.ok(false, "OK should never be called with a non-existing url");
		test.done();
	}

	function nok(result)
	{
		var error = result.error;
		test.ok(error.code === "EHOSTUNREACH", "wrong error returned: " + JSON.stringify(error));
		test.done();
	}

	var ajax = require('../io/ajax.js');
	ajax.send({},'http://212.170.239.72/appservices/http/FrontendService', ok, nok);
}

exports.dumbGetRequest = function (test) {
	test.expect(2);
	function ok(result) {
		result = JSON.parse(result);
		test.ok(result.rf1 === "holy", "Field 1 returned invalid value: " + result.rf1);
		test.ok(result.rf2 === "crap", "Field 2 returned invalid value: " + result.rf2);
		test.done();
	}

	function nok(error, statusCode)
	{
		test.ok(false, "valid call to test_get returned an error");
		test.done();
	}

	var ajax = require('../io/ajax.js');
	ajax.send({},'http://localhost/api/test_get.php?field1=holy&field2=crap', ok, nok, 'GET');
}

