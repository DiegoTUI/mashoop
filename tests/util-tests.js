/**
 * TuiInnovation.
 * Fake unit tests.
 *
 * Copyright (C) 2013 TuiInnovation.
 */

require("../util/core.js");

var util = require("../util/util.js");

exports.xmlToJson = function (test) {
	test.expect(50);
	var jsonObject = {
	    HotelListRQ: {
	        "@echoToken": "DummyEchoToken",
	        "@xmlns": "http://www.hotelbeds.com/schemas/2005/06/messages",
	        "@xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
	        "@xsi:schemaLocation": "http://www.hotelbeds.com/schemas/2005/06/messages HotelListRQ.xsd",
	        Language: "ENG",
	        Credentials:{
	            User: "ISLAS",
	            "Password": "ISLAS"
	        },
	        Destination:{
	            "@code": "PMI",
	            "@type": "SIMPLE",
	            "#value": "Palma"
	        },
	        ZoneList:[{zone:{"@code":"01",
	                         "name":"Alcudia"}},
	                  {zone:{"@code":"02",
	                         "name":"Andratx"}},
	                  {zone:{"@code":"03",
	                         "name":"Portals"}}
	        ],
	        "#list":[{classification:{"@code":"01",
	                                  "#value":"class1"}},
	                 {classification:{"@code":"02",
	                                  "#value":"class2"}}
	        ]
	    }
	}

	var xmlString = util.jsonToXml(jsonObject);
    for (var key in jsonObject) {
        checkNode(key, jsonObject[key], xmlString);
    }

    function checkNode(key, value, xmlString) {
	    if (key.startsWith('@')) {
	        test.ok(xmlString.contains(key.substringFrom('@'))===true,'attribute ' + key + ' passed correctly');
	    } else if (key === '#value') {
	        test.ok(xmlString.contains(value)===true, 'Value ' + value + ' passed correctly');
	    } else if (key === '#list') {
	        for (var i=0; i<value.length; i++) {
	            for (var innerKey in value[i]) {
	                checkNode(innerKey, value[i][innerKey], xmlString);
	            }
	        }
	    } else {
	        test.ok(xmlString.contains('<'+key)===true, 'key ' + key + ' found in opening');
	        test.ok(xmlString.contains('</'+key+'>')===true, 'key ' + key + ' found in closing');
	        if (typeof value === "string") {
	            test.ok(xmlString.contains(value)===true, 'string ' + value + 'found');
	        } else if (value instanceof Array) {
	            for (var i=0; i<value.length; i++) {
	                for (var innerKey in value[i]) {
	                    checkNode(innerKey, value[i][innerKey], xmlString);
	                }
	            }
	        } else if (value instanceof Object) {
	            for (var innerKey in value) {
	                checkNode(innerKey, value[innerKey], xmlString);
	            }
	        }
	    }
	}

    test.done();
}
