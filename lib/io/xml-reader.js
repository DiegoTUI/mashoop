'use strict';
/*
 * TuiInnovation nodejs.
 * XML Reader: receives an xml string and a description map and returns an array of objects
 *
 * Copyright (C) 2013 TuiInnovation.
 */

require("../util/core.js");
var log = require('../util/log.js');
var xml2js = require("xml2js");

/**
 * The XML reader.
 * xmlString: the xml in string format
 * descriptionMap: an array representing the values to be extracted from the xml.
 * tag: the tag to indicate which objects in the xml should we look for. Root if undefined or null
 * see xmlreader-tests to fully understand this class
 */
var XmlReader = function(xmlString, descriptionMap, tag)
{
	// self-reference
	var self = this;
	//Requires
	var util = require('../util/util.js');

	/**
	 * Reads the objects from the xmlString using the descriptionMap
	 * Returns an array of JS objects
	 * tag: the tag representing the objects in the xml to be read
	 */
	self.readObjects = function(callback) {
		//initialize result
		var result =[];
		//parse the xmlString in a JSON
		var parser = xml2js.Parser();
		parser.on("end", function(xmlObject){
			var objectToBrowse = (tag && (tag.length > 0)) ? findTag(xmlObject, tag) : xmlObject[Object.keys(xmlObject)[0]];
			if (objectToBrowse == null) {
				result = null;
			} else if (objectToBrowse instanceof Array) {
				for (var i=0; i<objectToBrowse.length; i++) {
					var elementToPush = processElement(objectToBrowse[i], descriptionMap); 
					if (!util.isEmpty(elementToPush))
						result.push(elementToPush);	
				}
			} else  { //It's an object
				var elementToPush = processElement(objectToBrowse, descriptionMap); 
				if (!util.isEmpty(elementToPush)){
					result = elementToPush;
				}
			}
			callback(result);
		});
		parser.parseString(xmlString);
	}

	/**
	 * Recursive function to find a tag in the xmlObject and return the value of it
	 * Returns null if the tag was not found
	 */
	 function findTag(xmlObject, tag) {
	 	if (xmlObject instanceof Array) {
	 		for (var i=0; i<xmlObject.length; i++) {
	 			var result = findTag(xmlObject[i], tag);
	 			if (result)
	 				return result;
	 		}
	 	} else if (typeof xmlObject === "object") {
	 		for (var key in xmlObject) {
	 			if (tag === key) {
	 				return xmlObject[key];
	 			} else {
	 				var result = findTag(xmlObject[key], tag);
	 				if (result)
	 					return result;
	 			}
	 		}
	 	}
	 	return null;
	 }

	/**
	 * Process an element of the xml according to the description Map and returns an object
	 * element: a JSON object containing the element to be processed
	 */
	function processElement(element, descriptionMap) {
		//initialize result
		var result = {};
		//iterate descriptionMap
		for (var i=0; i<descriptionMap.length; i++) {
			var item = descriptionMap[i];
			if (typeof item === 'string') {	//It's a string
				if (item in element)
					result[item] = getValue(element[item][0]);
			} 
			else if (typeof item === 'object') {	//It's a dictionary
				 if (Object.keys(item).length !== 1) {
                    log.error ("Malformed descriptionMap. More than 1 element in object: " + JSON.stringify(item));
                } else {
					//get the first (and only) key of the dictionary
					for (var key in item) {
						var value = item[key];
						if (value instanceof Array) {	//It's a list
							//get the array that contains the list
							var theList = listInXml(element,key);
							if (theList != null) {
								//initialize list
								var listifiedKey = key.listify();
								result[listifiedKey] = [];
								
								if (!(theList instanceof Array)) {
									log.error("listInXml returned a non array for key " + key);
								} else {
									for(var j=0; j<theList.length; j++) {
										result[listifiedKey].push(processElement(theList[j], value));
									}
								}
							}
						}
						else if (typeof value === 'string') {	//It's a deep value
							var potentialValue = valueInXml(element, value);
							if (potentialValue != null)
								result[key] = potentialValue;
						}
						break;	//we only consider the first key
					}
				}
			} 
		}
		return result;
	}

	/**
	 * Returns the text value of a node
	 */
	function getValue (node) {
		if (typeof node === 'string')
			return node;
		if ('_' in node)
			return node['_'];
		return null;
	}


	/**
	 * Explores an xml jQuery object and returns the list in path
	 * xmlObject: a JSON object containing the xml to look in
	 * path: a string like "TicketInfo.DescriptionList.Description" containing the path to look in.
	 */
	function listInXml (xmlObject, path) {
		var result = xmlObject;
		var pathArray = path.split(".");
		for (var i=0; i<(pathArray.length-1); i++) {
			if (pathArray[i] in result)
				result = result[pathArray[i]][0];
			else
				return null;
		}
		if (pathArray[pathArray.length-1] in result)
			return result[pathArray[pathArray.length-1]];
		return null;
	}

	/**
	 * Explores an xml jQuery object and returns the value in path
	 * xmlObject: a DOM object containing the xml to look in
	 * path: a string like "Description.@languageCode" containing the path to look in. "@" is for attributes
	 */
	function valueInXml (xmlObject, path) {
		var realPath = path.startsWith('@') ? path.substringUpTo('@') : path.substringUpTo('.@');
		var attribute = path.substringFrom('@');
		var realPathArray = realPath.length==0 ? [] : realPath.split(".");
		var tip = xmlObject;
		for (var i=0; i<realPathArray.length; i++) {
			if (realPathArray[i] in tip)
				tip = tip[realPathArray[i]][0];
			else
				return null;
		}
		var value = null;
		if (attribute === '') {	//No attributes
			value = getValue(tip);
		}
		else {	//There is an attribute at the end
			if (('$' in tip) && (attribute in tip['$']))
			value = tip['$'][attribute];
		}
		return value;
	}

	return self;
}

exports.XmlReader = XmlReader;

/***********************************
 ************ UNIT TESTS ***********
 ***********************************/
 var testing = require('testing');

 var ticketAvailString = '<TicketAvailRS xsi-schemaLocation="http://www.hotelbeds.com/schemas/2005/06/messages TicketAvailRS.xsd" totalItems="27" echoToken="DummyEchoToken"> \
	<AuditData> \
		<ProcessTime>647</ProcessTime> \
		<Timestamp>2013-05-13 10:49:38.031</Timestamp> \
		<RequestHost>10.162.29.83</RequestHost> \
		<ServerName>FORM</ServerName> \
		<ServerId>FO</ServerId> \
		<SchemaRelease>2005/06</SchemaRelease>  \
		<HydraCoreRelease>2.0.201304221213</HydraCoreRelease> \
		<HydraEnumerationsRelease>1.0.201304221213</HydraEnumerationsRelease> \
		<MerlinRelease>N/A</MerlinRelease> \
	</AuditData> \
	<PaginationData currentPage="1" totalPages="2"/> \
	<ServiceTicket xsi-type="ServiceTicket" availToken="9ey6mENxtyujqkVKnqvpMA=="> \
		<DateFrom date="DateFrom1"/> \
		<DateTo date="DateTo1"/> \
		<Currency code="EUR1">Euro1</Currency> \
		<TicketInfo xsi-type="ProductTicket"> \
			<Code>000200515</Code> \
			<Name>Ticket1</Name> \
			<DescriptionList> \
				<Description type="generalDescription" languageCode="ENG">Description 11</Description> \
				<Description type="generalDescription" languageCode="SPA">Description 12</Description> \
			</DescriptionList> \
			<ImageList> \
				<Image> \
					<Type>S</Type> \
					<Order>0</Order> \
					<VisualizationOrder>0</VisualizationOrder> \
					<Url>Image11</Url> \
				</Image> \
				<Image> \
					<Type>S</Type> \
					<Order>0</Order> \
					<VisualizationOrder>0</VisualizationOrder> \
					<Url>Image12</Url> \
				</Image> \
				<Image> \
					<Type>S</Type> \
					<Order>0</Order> \
					<VisualizationOrder>0</VisualizationOrder> \
					<Url>Image13</Url> \
				</Image> \
			</ImageList> \
		</TicketInfo> \
	</ServiceTicket> \
	<ServiceTicket xsi-type="ServiceTicket" availToken="9ey6mENxtyujqkVKnqvpMA=="> \
		<DateFrom date="DateFrom2"/> \
		<DateTo date="DateTo2"/> \
		<Currency code="EUR2">Euro2</Currency> \
		<TicketInfo xsi-type="ProductTicket"> \
			<Code>000200515</Code> \
			<Name>Ticket2</Name> \
			<DescriptionList> \
				<Description type="generalDescription" languageCode="ENG">Description 21</Description> \
				<Description type="generalDescription" languageCode="SPA">Description 22</Description> \
			</DescriptionList> \
			<ImageList> \
				<Image> \
					<Type>S</Type> \
					<Order>0</Order> \
					<VisualizationOrder>0</VisualizationOrder> \
					<Url>Image21</Url> \
				</Image> \
				<Image> \
					<Type>S</Type> \
					<Order>0</Order> \
					<VisualizationOrder>0</VisualizationOrder> \
					<Url>Image22</Url> \
				</Image> \
				<Image> \
					<Type>S</Type> \
					<Order>0</Order> \
					<VisualizationOrder>0</VisualizationOrder> \
					<Url>Image23</Url> \
				</Image> \
			</ImageList> \
		</TicketInfo> \
	</ServiceTicket> \
</TicketAvailRS>';

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

var ticketClassificationListString = '<TicketClassificationListRS xsi-schemaLocation="http://www.hotelbeds.com/schemas/2005/06/messages TicketClassificationListRS.xsd" totalItems="9" echoToken="DummyEchoToken"> \
	<AuditData> \
		<ProcessTime>4</ProcessTime> \
		<Timestamp>2013-05-15 13:21:03.741</Timestamp> \
		<RequestHost>10.162.29.83</RequestHost> \
		<ServerName>FORM</ServerName> \
		<ServerId>FO</ServerId> \
		<SchemaRelease>2005/06</SchemaRelease> \
		<HydraCoreRelease>2.0.201304221213</HydraCoreRelease> \
		<HydraEnumerationsRelease>1.0.201304221213</HydraEnumerationsRelease> \
		<MerlinRelease>N/A</MerlinRelease> \
	</AuditData> \
	<Classification code="CULTU">Culture Museums</Classification> \
	<Classification code="FD">Full Day</Classification> \
	<Classification code="FOOD">Food Nightlife</Classification> \
	<Classification code="HD">In the morning</Classification> \
	<Classification code="MD">Multi Day Services</Classification> \
	<Classification code="OUTAC">Outdoor Adventure</Classification> \
	<Classification code="PARTE">Theme Aquatic Parks</Classification> \
	<Classification code="SHOW">Shows and Events</Classification> \
	<Classification code="SIGHT">Sightseeing Tours</Classification> \
</TicketClassificationListRS>';

var ticketClassificationListMap = [
{'Code':'@code'},
{'Name':''}];

var ticketClassificationListMapAlt = [
{'TotalItems':'@totalItems'},
{'Classification':[{'Code':'@code'},
					{'Name':''}]}];

function testTicketAvailWrongTag (callback) {
	var xmlReader = new XmlReader (ticketAvailString, ticketAvailMap, 'WrongTag');
	xmlReader.readObjects(function (parsedXml) {
		testing.assertEquals(parsedXml, null, 'parsedXml should be null in WrongTag', callback)
		testing.success(callback);
	});
}

function testTicketAvail (callback) {
	var xmlReader = new XmlReader (ticketAvailString, ticketAvailMap, 'ServiceTicket');
	xmlReader.readObjects(function (parsedXml) {
		testing.assert(parsedXml instanceof Array, 'parsedXml should be an array', callback);
		testing.assertEquals(parsedXml.length, 2, 'parsedXml should have 2 elements', callback);
		testing.assertEquals(parsedXml[0].DateFrom , 'DateFrom1', 'dateFrom is correct in 1', callback);
		testing.assertEquals(parsedXml[0].DateTo , 'DateTo1', 'dateTo is correct in 1', callback);
		testing.assertEquals(parsedXml[1].DateFrom , 'DateFrom2', 'dateFrom is correct in 2', callback);
		testing.assertEquals(parsedXml[1].DateTo , 'DateTo2', 'dateTo is correct in 2', callback);
		testing.assertEquals(parsedXml[0].Currency , 'Euro1', 'Currency is correct in 1', callback);
		testing.assertEquals(parsedXml[0].CurrencyCode , 'EUR1', 'CurrencyCode is correct in 1', callback);
		testing.assertEquals(parsedXml[1].Currency , 'Euro2', 'Currency is correct in 2', callback);
		testing.assertEquals(parsedXml[1].CurrencyCode , 'EUR2', 'CurrencyCode is correct in 2', callback);
		testing.assertEquals(parsedXml[0].Name , 'Ticket1', 'Ticket name is correct in 1', callback);
		testing.assertEquals(parsedXml[1].Name , 'Ticket2', 'Ticket name is correct in 2', callback);
		for (var i=0; i<parsedXml.length; i++) {
			var ImageList = parsedXml[i]['TicketInfo.ImageList.Image'.listify()];
			var DescriptionList = parsedXml[i]['TicketInfo.DescriptionList.Description'.listify()];
			testing.assertEquals(ImageList.length , 3, 'Only 3 images in the list: ' + ImageList.length, callback);
			for (var j=0; j<3; j++) {
				testing.assertEquals(ImageList[j].Type , "S", "wrong image type in ticket " + i + " image " + j, callback);
				testing.assertEquals(ImageList[j].Url , "Image"+(i+1)+""+(j+1), "wrong image url in ticket " + i + " image " + j, callback);
			}
			testing.assertEquals(DescriptionList.length , 2, 'Only 2 descriptions in the list: ' + DescriptionList.length, callback);
			for (var j=0; j<2; j++) {
				testing.assertEquals(DescriptionList[j].Type , "generalDescription", "wrong description type in ticket " + i + " description " + j, callback);
				testing.assertEquals(DescriptionList[j].Description , "Description "+(i+1)+""+(j+1), "wrong description text in ticket " + i + " description " + j, callback);
			}
		}
		testing.success(callback);
	});
}

function testTicketAvailAlt (callback) {
	var xmlReader = new XmlReader (ticketAvailString, ticketAvailMapAlt);
	xmlReader.readObjects(function (parsedXml) {
		testing.assert(parsedXml instanceof Object, 'parsedXml is an object', callback);
		testing.assertEquals(parsedXml.TotalItems , '27', 'TotalItems retrieved is correct', callback);
		testing.assertEquals(parsedXml.ServiceTicketList.length , 2, 'ServiceTicketList has 2 elements', callback);
		testing.assertEquals(parsedXml.ServiceTicketList[0].DateFrom , 'DateFrom1', 'dateFrom is correct in 1', callback);
		testing.assertEquals(parsedXml.ServiceTicketList[0].DateTo , 'DateTo1', 'dateTo is correct in 1', callback);
		testing.assertEquals(parsedXml.ServiceTicketList[1].DateFrom , 'DateFrom2', 'dateFrom is correct in 2', callback);
		testing.assertEquals(parsedXml.ServiceTicketList[1].DateTo , 'DateTo2', 'dateTo is correct in 2', callback);
		testing.assertEquals(parsedXml.ServiceTicketList[0].Currency , 'Euro1', 'Currency is correct in 1', callback);
		testing.assertEquals(parsedXml.ServiceTicketList[0].CurrencyCode , 'EUR1', 'CurrencyCode is correct in 1', callback);
		testing.assertEquals(parsedXml.ServiceTicketList[1].Currency , 'Euro2', 'Currency is correct in 2', callback);
		testing.assertEquals(parsedXml.ServiceTicketList[1].CurrencyCode , 'EUR2', 'CurrencyCode is correct in 2', callback);
		testing.assertEquals(parsedXml.ServiceTicketList[0].Name , 'Ticket1', 'Ticket name is correct in 1', callback);
		testing.assertEquals(parsedXml.ServiceTicketList[1].Name , 'Ticket2', 'Ticket name is correct in 2', callback);
		for (var i=0; i<parsedXml.ServiceTicketList.length; i++) {
			var ImageList = parsedXml.ServiceTicketList[i]['TicketInfo.ImageList.Image'.listify()];
			var DescriptionList = parsedXml.ServiceTicketList[i]['TicketInfo.DescriptionList.Description'.listify()];
			testing.assertEquals(ImageList.length , 3, 'Only 3 images in the list: ' + ImageList.length, callback);
			for (var j=0; j<3; j++) {
				testing.assertEquals(ImageList[j].Type , "S", "wrong image type in ticket " + i + " image " + j, callback);
				testing.assertEquals(ImageList[j].Url , "Image"+(i+1)+""+(j+1), "wrong image url in ticket " + i + " image " + j, callback);
			}
			testing.assertEquals(DescriptionList.length , 2, 'Only 2 descriptions in the list: ' + DescriptionList.length);
			for (var j=0; j<2; j++) {
				testing.assertEquals(DescriptionList[j].Type , "generalDescription", "wrong description type in ticket " + i + " description " + j, callback);
				testing.assertEquals(DescriptionList[j].Description , "Description "+(i+1)+""+(j+1), "wrong description text in ticket " + i + " description " + j, callback);
			}
		}
		testing.success(callback);
	});
}

function testTicketClassificationList (callback) {
	var xmlReader = new XmlReader (ticketClassificationListString, ticketClassificationListMap, 'Classification');
	xmlReader.readObjects(function (parsedXml) {
		testing.assert(parsedXml instanceof Array, 'parsedXml is an array', callback);
		testing.assertEquals(parsedXml.length , 9, 'parsedXml has 9 elements', callback);
		testing.assertEquals(parsedXml[0].Code , 'CULTU', 'Code in element 1 is ok', callback);
		testing.assertEquals(parsedXml[0].Name , 'Culture Museums', 'Code in element 1 is ok', callback);
		testing.assertEquals(parsedXml[1].Code , 'FD', 'Code in element 2 is ok', callback);
		testing.assertEquals(parsedXml[1].Name , 'Full Day', 'Code in element 2 is ok', callback);
		testing.assertEquals(parsedXml[2].Code , 'FOOD', 'Code in element 3 is ok', callback);
		testing.assertEquals(parsedXml[2].Name , 'Food Nightlife', 'Code in element 3 is ok', callback);
		testing.assertEquals(parsedXml[3].Code , 'HD', 'Code in element 4 is ok', callback);
		testing.assertEquals(parsedXml[3].Name , 'In the morning', 'Code in element 4 is ok', callback);
		testing.assertEquals(parsedXml[4].Code , 'MD', 'Code in element 5 is ok', callback);
		testing.assertEquals(parsedXml[4].Name , 'Multi Day Services', 'Code in element 5 is ok', callback);
		testing.assertEquals(parsedXml[5].Code , 'OUTAC', 'Code in element 6 is ok', callback);
		testing.assertEquals(parsedXml[5].Name , 'Outdoor Adventure', 'Code in element 6 is ok', callback);
		testing.assertEquals(parsedXml[6].Code , 'PARTE', 'Code in element 7 is ok', callback);
		testing.assertEquals(parsedXml[6].Name , 'Theme Aquatic Parks', 'Code in element 7 is ok', callback);
		testing.assertEquals(parsedXml[7].Code , 'SHOW', 'Code in element 8 is ok', callback);
		testing.assertEquals(parsedXml[7].Name , 'Shows and Events', 'Code in element 8 is ok', callback);
		testing.assertEquals(parsedXml[8].Code , 'SIGHT', 'Code in element 9 is ok', callback);
		testing.assertEquals(parsedXml[8].Name , 'Sightseeing Tours', 'Code in element 9 is ok', callback);
		testing.success(callback);
	});
	
}

function testTicketClassificationListAlt (callback) {
	var xmlReader = new XmlReader (ticketClassificationListString, ticketClassificationListMapAlt);
	xmlReader.readObjects(function (parsedXml) {
		testing.assert(parsedXml instanceof Object, 'parsedXml is an object', callback);
		testing.assertEquals(parsedXml.TotalItems , '9', 'TotalItems retrieved is correct', callback);
		testing.assertEquals(parsedXml.ClassificationList.length , 9, 'ClassificationList has 9 elements', callback);
		testing.assertEquals(parsedXml.ClassificationList[0].Code , 'CULTU', 'Code in element 1 is ok', callback);
		testing.assertEquals(parsedXml.ClassificationList[0].Name , 'Culture Museums', 'Code in element 1 is ok', callback);
		testing.assertEquals(parsedXml.ClassificationList[1].Code , 'FD', 'Code in element 2 is ok', callback);
		testing.assertEquals(parsedXml.ClassificationList[1].Name , 'Full Day', 'Code in element 2 is ok', callback);
		testing.assertEquals(parsedXml.ClassificationList[2].Code , 'FOOD', 'Code in element 3 is ok', callback);
		testing.assertEquals(parsedXml.ClassificationList[2].Name , 'Food Nightlife', 'Code in element 3 is ok', callback);
		testing.assertEquals(parsedXml.ClassificationList[3].Code , 'HD', 'Code in element 4 is ok', callback);
		testing.assertEquals(parsedXml.ClassificationList[3].Name , 'In the morning', 'Code in element 4 is ok', callback);
		testing.assertEquals(parsedXml.ClassificationList[4].Code , 'MD', 'Code in element 5 is ok', callback);
		testing.assertEquals(parsedXml.ClassificationList[4].Name , 'Multi Day Services', 'Code in element 5 is ok', callback);
		testing.assertEquals(parsedXml.ClassificationList[5].Code , 'OUTAC', 'Code in element 6 is ok', callback);
		testing.assertEquals(parsedXml.ClassificationList[5].Name , 'Outdoor Adventure', 'Code in element 6 is ok', callback);
		testing.assertEquals(parsedXml.ClassificationList[6].Code , 'PARTE', 'Code in element 7 is ok', callback);
		testing.assertEquals(parsedXml.ClassificationList[6].Name , 'Theme Aquatic Parks', 'Code in element 7 is ok', callback);
		testing.assertEquals(parsedXml.ClassificationList[7].Code , 'SHOW', 'Code in element 8 is ok', callback);
		testing.assertEquals(parsedXml.ClassificationList[7].Name , 'Shows and Events', 'Code in element 8 is ok', callback);
		testing.assertEquals(parsedXml.ClassificationList[8].Code , 'SIGHT', 'Code in element 9 is ok', callback);
		testing.assertEquals(parsedXml.ClassificationList[8].Name , 'Sightseeing Tours', 'Code in element 9 is ok', callback);
		testing.success(callback);
	});	
}

 exports.test = function(callback) {
	testing.run({
		testTicketAvailWrongTag: testTicketAvailWrongTag,
		testTicketAvail: testTicketAvail,
		testTicketAvailAlt: testTicketAvailAlt,
		testTicketClassificationList: testTicketClassificationList,
		testTicketClassificationListAlt: testTicketClassificationListAlt
	}, callback);
}

 // start tests if invoked directly
if (__filename == process.argv[1])
{
    exports.test(testing.show);
}

