'use strict';
/*
 * TuiInnovation nodejs.
 * XML Reader: receives an xml string and a description map and returns an array of objects
 *
 * Copyright (C) 2013 TuiInnovation.
 */
//requires
require('../util/prototypes.js');
var log = require('../util/log.js');
var xml2js = require('xml2js');
var core = require('../util/core.js');
var testing = require('testing');

/**
 * The XML reader.
 * xmlString: the xml in string format
 * descriptionMap: an array representing the values to be extracted from the xml.
 * tag: the tag to indicate which objects in the xml should we look for. Root if undefined or null
 * see xmlreader-tests to fully understand this class
 */
exports.XmlReader = function(xmlString, descriptionMap, tag) {
	// self-reference
	var self = this;

	/**
	 * Reads the objects from the xmlString using the descriptionMap
	 * callback: a function(error, result) returning an error or a JSON with the parsed objects
	 */
	self.readObjects = function(callback) {
		//initialize result and error
		var result = [];
		var error = null;
		//parse the xmlString in a JSON
		var parser = xml2js.Parser();
		parser.on('end', function(xmlObject){
			var objectToBrowse = (tag && (tag.length > 0)) ? findTag(xmlObject, tag) : xmlObject[Object.keys(xmlObject)[0]];
			var elementToPush = null;
			if (objectToBrowse === null) {
				error = {error:'005-xml-parsing-error',
							statusCode: 500,
							description: 'The XML returned by Atlas could not be parsed by the server',
							contact: 'dlafuente@tuitravel-ad.com'};
			} else if (objectToBrowse instanceof Array) {
				for (var i=0; i<objectToBrowse.length; i++) {
					elementToPush = processElement(objectToBrowse[i], descriptionMap);
					if (!core.isEmpty(elementToPush))
						result.push(elementToPush);
				}
			} else { //It's an object
				elementToPush = processElement(objectToBrowse, descriptionMap);
				if (!core.isEmpty(elementToPush)){
					result = elementToPush;
				}
			}
			callback(error, result);
		});
		parser.parseString(xmlString);
	};

	/**
	 * Recursive function to find a tag in the xmlObject and return the value of it
	 * Returns null if the tag was not found
	 */
	 function findTag(xmlObject, tag) {
		var result = null;
		if (xmlObject instanceof Array) {
			for (var i=0; i<xmlObject.length; i++) {
				result = findTag(xmlObject[i], tag);
				if (result)
					return result;
			}
		} else if (typeof xmlObject === 'object') {
			for (var key in xmlObject) {
				if (tag === key) {
					return xmlObject[key];
				} else {
					result = findTag(xmlObject[key], tag);
					if (result)
						return result;
				}
			}
		}
		return result;
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
                    log.error ('Malformed descriptionMap. More than 1 element in object: ' + JSON.stringify(item));
                } else {
					//get the first (and only) key of the dictionary
					for (var key in item) {
						var value = item[key];
						if (value instanceof Array) {	//It's a list
							//get the array that contains the list
							var theList = listInXml(element,key);
							if (theList !== null) {
								//initialize list
								var listifiedKey = key.listify();
								result[listifiedKey] = [];
								
								if (!(theList instanceof Array)) {
									log.error('listInXml returned a non array for key ' + key);
								} else {
									for(var j=0; j<theList.length; j++) {
										result[listifiedKey].push(processElement(theList[j], value));
									}
								}
							}
						}
						else if (typeof value === 'string') {	//It's a deep value
							var potentialValue = valueInXml(element, value);
							if (potentialValue !== null)
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
			return node._;
		return null;
	}


	/**
	 * Explores an xml jQuery object and returns the list in path
	 * xmlObject: a JSON object containing the xml to look in
	 * path: a string like 'TicketInfo.DescriptionList.Description' containing the path to look in.
	 */
	function listInXml (xmlObject, path) {
		var result = xmlObject;
		var pathArray = path.split('.');
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
	 * path: a string like 'Description.@languageCode' containing the path to look in. '@' is for attributes
	 */
	function valueInXml (xmlObject, path) {
		var realPath = path.startsWith('@') ? path.substringUpTo('@') : path.substringUpTo('.@');
		var attribute = path.substringFrom('@');
		var realPathArray = realPath.length===0 ? [] : realPath.split('.');
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
			if (('$' in tip) && (attribute in tip.$))
			value = tip.$[attribute];
		}
		return value;
	}

	return self;
};

/***********************************
 ************ UNIT TESTS ***********
 ***********************************/
 /*jshint multistr: true */
var ticketAvailString = '<TicketAvailRS xsi-schemaLocation=\'http://www.hotelbeds.com/schemas/2005/06/messages TicketAvailRS.xsd\' totalItems=\'27\' echoToken=\'DummyEchoToken\'> \
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
	<PaginationData currentPage=\'1\' totalPages=\'2\'/> \
	<ServiceTicket xsi-type=\'ServiceTicket\' availToken=\'9ey6mENxtyujqkVKnqvpMA==\'> \
		<DateFrom date=\'DateFrom1\'/> \
		<DateTo date=\'DateTo1\'/> \
		<Currency code=\'EUR1\'>Euro1</Currency> \
		<TicketInfo xsi-type=\'ProductTicket\'> \
			<Code>000200515</Code> \
			<Name>Ticket1</Name> \
			<DescriptionList> \
				<Description type=\'generalDescription\' languageCode=\'ENG\'>Description 11</Description> \
				<Description type=\'generalDescription\' languageCode=\'SPA\'>Description 12</Description> \
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
	<ServiceTicket xsi-type=\'ServiceTicket\' availToken=\'9ey6mENxtyujqkVKnqvpMA==\'> \
		<DateFrom date=\'DateFrom2\'/> \
		<DateTo date=\'DateTo2\'/> \
		<Currency code=\'EUR2\'>Euro2</Currency> \
		<TicketInfo xsi-type=\'ProductTicket\'> \
			<Code>000200515</Code> \
			<Name>Ticket2</Name> \
			<DescriptionList> \
				<Description type=\'generalDescription\' languageCode=\'ENG\'>Description 21</Description> \
				<Description type=\'generalDescription\' languageCode=\'SPA\'>Description 22</Description> \
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

var ticketClassificationListString = '<TicketClassificationListRS xsi-schemaLocation=\'http://www.hotelbeds.com/schemas/2005/06/messages TicketClassificationListRS.xsd\' totalItems=\'9\' echoToken=\'DummyEchoToken\'> \
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
	<Classification code=\'CULTU\'>Culture Museums</Classification> \
	<Classification code=\'FD\'>Full Day</Classification> \
	<Classification code=\'FOOD\'>Food Nightlife</Classification> \
	<Classification code=\'HD\'>In the morning</Classification> \
	<Classification code=\'MD\'>Multi Day Services</Classification> \
	<Classification code=\'OUTAC\'>Outdoor Adventure</Classification> \
	<Classification code=\'PARTE\'>Theme Aquatic Parks</Classification> \
	<Classification code=\'SHOW\'>Shows and Events</Classification> \
	<Classification code=\'SIGHT\'>Sightseeing Tours</Classification> \
</TicketClassificationListRS>';

var ticketClassificationListMap = [
{'Code':'@code'},
{'Name':''}];

var ticketClassificationListMapAlt = [
{'TotalItems':'@totalItems'},
{'Classification':[{'Code':'@code'},
					{'Name':''}]}];

var hotelDetailString = '<HotelDetailRS xsi:schemaLocation=\"http://www.hotelbeds.com/schemas/2005/06/messages HotelDetailRS.xsd\" echoToken=\"esthntv0\" xmlns=\"http://www.hotelbeds.com/schemas/2005/06/messages\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"> \
<AuditData> \
	<ProcessTime>64</ProcessTime> \
	<Timestamp>2013-12-12 08:21:31.563</Timestamp> \
	<RequestHost>10.162.29.34</RequestHost> \
	<ServerName>LIVE</ServerName> \
	<ServerId>69</ServerId> \
	<SchemaRelease>2005/06</SchemaRelease> \
	<HydraCoreRelease>2.0.201311271719</HydraCoreRelease> \
	<HydraEnumerationsRelease>1.0.201311271719</HydraEnumerationsRelease> \
	<MerlinRelease>N/A</MerlinRelease> \
</AuditData> \
<Hotel xsi:type=\"ProductHotel\"> \
	<Code>175908</Code> \
	<Name>Mellow Hostel</Name> \
	<DescriptionList> \
		<Description type=\"HotelDescription\" languageCode=\"ENG\" languageName=\"Ingles\">Further information about this hotel will be available shortly</Description> \
	</DescriptionList> \
	<Contact> \
		<Address> \
			<StreetTypeId>.</StreetTypeId> \
			<StreetTypeName> </StreetTypeName> \
			<StreetName>CARRER D\'AGUILAR</StreetName> \
			<Number>54</Number> \
			<PostalCode>08032</PostalCode> \
			<City>BARCELONA</City> \
			<CountryCode>ES</CountryCode> \
		</Address> \
	</Contact> \
	<Category type=\"SIMPLE\" code=\"1EST\" shortname=\"1*\">1 STAR</Category> \
	<Destination type=\"SIMPLE\" code=\"BCN\"> \
		<Name>Barcelona</Name> \
		<ZoneList> \
			<Zone type=\"SIMPLE\" code=\"58\">Otras Zonas</Zone> \
		</ZoneList> \
	</Destination> \
	<FacilityList> \
		<Feature xsi:type=\"ProductFeatureSport\" group=\"10\"> \
			<Code>20</Code> \
			<Name>buildingFacility</Name> \
			<Description>Year of construction</Description> \
			<Value>1940</Value> \
		</Feature> \
			<Feature xsi:type=\"ProductFeatureSport\" group=\"10\"> \
			<Code>30</Code> \
			<Name>buildingFacility</Name> \
			<Description>Year of most recent renovation</Description> \
			<Value>1992</Value> \
		</Feature> \
	</FacilityList> \
	<Position latitude=\"41.426511\" longitude=\"2.168083\"/> \
</Hotel> \
</HotelDetailRS>';

var hotelDetailMap = [
		{'code':'Hotel.Code'},
		{'name':'Hotel.Name'},
		{'Hotel.DescriptionList.Description':[{'type': '@type'},
							 			{'description': ''}]},
		{'Hotel.ImageList.Image': [{'type': 'Type'},
							{'url': 'Url'},
							{'description': 'Description'}]},
		{'streetTypeId': 'Hotel.Contact.StreetTypeId'},
		{'streetTypeName': 'Hotel.Contact.StreetTypeName'},
		{'streetName': 'Hotel.Contact.StreetName'},
		{'streetNumber': 'Hotel.Contact.Number'},
		{'zipCode': 'Hotel.Contact.PostalCode'},
		{'city': 'Hotel.Contact.City'},
		{'countryCode': 'Hotel.Contact.CountryCode'},
		{'Hotel.Contact.EmailList.Email':[{'email': ''}]},
		{'Hotel.Contact.PhoneList.ContactNumber':[{'type': '@type'},
											{'number': ''}]},
		{'Hotel.Contact.WebList.Web':[{'web': ''}]},
		{'category': 'Hotel.Category'},
		{'destinationCode': 'Hotel.Destination.@code'},
		{'Hotel.Destination.ZoneList.Zone':[{'code': '@code'},
											{'name': ''}]},
		{'Hotel.FacilityList.Feature': [{'type': '@xsi:type'},
										{'group': '@group'},
										{'fee': '@fee'},
										{'code': 'Code'},
										{'name': 'Name'},
										{'description': 'Description'},
										{'value': 'Value'},
										{'DistanceList.Distance':[{'unit':'@unit'},
																	{'value': ''}]},
										]},
		{'chainCode':'Hotel.Chain.@code'},
		{'chainName':'Hotel.Chain'},
		{'licenseNumber': 'Hotel.licenseNumber'},
		{'latitude': 'Hotel.Position.@latitude'},
		{'longitude': 'Hotel.Position.@longitude'}
	];

function testTicketAvailWrongTag (callback) {
	var xmlReader = new exports.XmlReader (ticketAvailString, ticketAvailMap, 'WrongTag');
	xmlReader.readObjects(function (error/*, parsedXml*/) {
		testing.assert(error !== null, 'wrong tag should throw an error', callback);
		testing.assertEquals(error.error, '005-xml-parsing-error', 'wrong tag returned wron error', callback);
		testing.success(callback);
	});
}

function testTicketAvail (callback) {
	var xmlReader = new exports.XmlReader (ticketAvailString, ticketAvailMap, 'ServiceTicket');
	xmlReader.readObjects(function (error, parsedXml) {
		testing.assertEquals(error, null, 'valid xml returned an error', callback);
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
			testing.assertEquals(ImageList.length , 3, 'Only 3 images in the list', callback);
			for (var j=0; j<3; j++) {
				testing.assertEquals(ImageList[j].Type , 'S', 'wrong image type in ticket ' + i + ' image ' + j, callback);
				testing.assertEquals(ImageList[j].Url , 'Image'+(i+1)+''+(j+1), 'wrong image url in ticket ' + i + ' image ' + j, callback);
			}
			testing.assertEquals(DescriptionList.length , 2, 'Only 2 descriptions in the list', callback);
			for (var k=0; k<2; k++) {
				testing.assertEquals(DescriptionList[k].Type , 'generalDescription', 'wrong description type in ticket ' + i + ' description ' + k, callback);
				testing.assertEquals(DescriptionList[k].Description , 'Description '+(i+1)+''+(k+1), 'wrong description text in ticket ' + i + ' description ' + k, callback);
			}
		}
		testing.success(callback);
	});
}

function testTicketAvailAlt (callback) {
	var xmlReader = new exports.XmlReader (ticketAvailString, ticketAvailMapAlt);
	xmlReader.readObjects(function (error, parsedXml) {
		testing.assertEquals(error, null, 'valid xml returned an error', callback);
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
			testing.assertEquals(ImageList.length , 3, 'Only 3 images in the list', callback);
			for (var j=0; j<3; j++) {
				testing.assertEquals(ImageList[j].Type , 'S', 'wrong image type in ticket ' + i + ' image ' + j, callback);
				testing.assertEquals(ImageList[j].Url , 'Image'+(i+1)+''+(j+1), 'wrong image url in ticket ' + i + ' image ' + j, callback);
			}
			testing.assertEquals(DescriptionList.length , 2, 'Only 2 descriptions in the list');
			for (var k=0; k<2; k++) {
				testing.assertEquals(DescriptionList[k].Type , 'generalDescription', 'wrong description type in ticket ' + i + ' description ' + k, callback);
				testing.assertEquals(DescriptionList[k].Description , 'Description '+(i+1)+''+(k+1), 'wrong description text in ticket ' + i + ' description ' + k, callback);
			}
		}
		testing.success(callback);
	});
}

function testTicketClassificationList (callback) {
	var xmlReader = new exports.XmlReader (ticketClassificationListString, ticketClassificationListMap, 'Classification');
	xmlReader.readObjects(function (error, parsedXml) {
		testing.assertEquals(error, null, 'valid xml returned an error', callback);
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
	var xmlReader = new exports.XmlReader (ticketClassificationListString, ticketClassificationListMapAlt);
	xmlReader.readObjects(function (error, parsedXml) {
		testing.assertEquals(error, null, 'valid xml returned an error', callback);
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

function testHotelDetail (callback) {
	var xmlReader = new exports.XmlReader (hotelDetailString, hotelDetailMap);
	xmlReader.readObjects(function (error, parsedXml) {
		testing.assertEquals(error, null, 'valid xml returned an error', callback);
		testing.assert(parsedXml instanceof Object, 'parsedXml is an object', callback);
		testing.assertEquals(parsedXml.code , "175908", 'Code parsed right', callback);
		testing.assertEquals(parsedXml.name , "Mellow Hostel", 'Name parsed right', callback);
		testing.assertEquals(parsedXml.DescriptionList.length , 1, 'Right number of elements in DescriptionList', callback);
		testing.assertEquals(parsedXml.DescriptionList[0].type , "HotelDescription", 'DescriptionList.type parsed right', callback);
		testing.assertEquals(parsedXml.DescriptionList[0].description , "Further information about this hotel will be available shortly", 'DescriptionList.description parsed right', callback);
		testing.assertEquals(parsedXml.category , "1 STAR", 'category parsed right', callback);
		testing.assertEquals(parsedXml.destinationCode , "BCN", 'destinationCode parsed right', callback);
		testing.assertEquals(parsedXml.ZoneList.length , 1, 'Right number of elements in ZoneList', callback);
		testing.assertEquals(parsedXml.ZoneList[0].code , "58", 'ZoneList.code parsed right', callback);
		testing.assertEquals(parsedXml.ZoneList[0].name , "Otras Zonas", 'ZoneList.name parsed right', callback);
		testing.assertEquals(parsedXml.FeatureList.length , 2, 'Right number of elements in FeatureList', callback);
		testing.assertEquals(parsedXml.FeatureList[0].type , "ProductFeatureSport", 'FeatureList.type parsed right', callback);
		testing.assertEquals(parsedXml.FeatureList[0].group , "10", 'FeatureList.group parsed right', callback);
		testing.assertEquals(parsedXml.FeatureList[0].code , "20", 'FeatureList.code parsed right', callback);
		testing.assertEquals(parsedXml.FeatureList[0].name , "buildingFacility", 'FeatureList.name parsed right', callback);
		testing.assertEquals(parsedXml.FeatureList[0].description , "Year of construction", 'FeatureList.description parsed right', callback);
		testing.assertEquals(parsedXml.FeatureList[0].value , "1940", 'FeatureList.value parsed right', callback);
		testing.assertEquals(parsedXml.FeatureList[1].type , "ProductFeatureSport", 'FeatureList.type parsed right', callback);
		testing.assertEquals(parsedXml.FeatureList[1].group , "10", 'FeatureList.group parsed right', callback);
		testing.assertEquals(parsedXml.FeatureList[1].code , "30", 'FeatureList.code parsed right', callback);
		testing.assertEquals(parsedXml.FeatureList[1].name , "buildingFacility", 'FeatureList.name parsed right', callback);
		testing.assertEquals(parsedXml.FeatureList[1].description , "Year of most recent renovation", 'FeatureList.description parsed right', callback);
		testing.assertEquals(parsedXml.FeatureList[1].value , "1992", 'FeatureList.value parsed right', callback);
		testing.success(callback);
	});
}

 exports.test = function(callback) {
	testing.run({
		testTicketAvailWrongTag: testTicketAvailWrongTag,
		testTicketAvail: testTicketAvail,
		testTicketAvailAlt: testTicketAvailAlt,
		testTicketClassificationList: testTicketClassificationList,
		testTicketClassificationListAlt: testTicketClassificationListAlt,
		testHotelDetail: testHotelDetail
	}, callback);
};

 // start tests if invoked directly
if (__filename == process.argv[1]) {
    exports.test(testing.show);
}

