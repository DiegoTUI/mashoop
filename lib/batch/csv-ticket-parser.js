'use strict';
// requires
var async = require('async');
var fs = require('fs');
var csv = require('csv');
var Log = require('log');
var log = new Log();
var db = require('../db.js');

// global variables
var itemCollection = null;
var collectionName = 'tickets';

csv()
.from.path(__dirname+'/palma_tickets.csv', { delimiter: ';'})
.to.array(function(csvArray) {
	log.info (csvArray)
	db.addCallback(function (error, result) {
		if (error) {
			log.error ('ERROR in db.addcallback: ' + error);
			process.exit(1);
		}
		itemCollection = result.collection(collectionName);
		updateMongo(csvArray);
	}); 
});

function updateMongo(csvArray) {
	var destination = 'PMI';
	var ticketCodeIndex = 1;
	var indoorIndex = 3;
	var morningIndex = 4;
	var afternoonIndex = 5;
	var eveningIndex = 6;
	var fulldayIndex = 7;
	var latitudeIndex = 8;
	var longitudeIndex = 9;
	var processedItems = 0;

	csvArray.forEach(function(csvItem) {
		// find the item and update it
		async.waterfall([
			//find the item
			function (callback) {
				itemCollection.findOne({destinationCode: destination, code:csvItem[ticketCodeIndex]}, function(error, retrievedItem) {
					callback(error, retrievedItem);
				});
			},
			//set the extra fields
			function (retrievedItem, callback) {
				if (retrievedItem === null) {
					return callback(null);
				}
				log.info ("Found item: " + retrievedItem.code + ".Lat: " + parseFloat(csvItem[latitudeIndex]) + ". Lon: " + parseFloat(csvItem[longitudeIndex]))
				var setItem = {
					indoor: csvItem[indoorIndex] === 'Y' ? true : false,
					morning: csvItem[morningIndex] === 'Y' ? true : false,
					afternoon: csvItem[afternoonIndex] === 'Y' ? true : false,
					evening: csvItem[eveningIndex] === 'Y' ? true : false,
					fullday: csvItem[fulldayIndex] === 'Y' ? true : false,
					loc:{type:"Point", 
									coordinates: [parseFloat(csvItem[longitudeIndex]), parseFloat(csvItem[latitudeIndex])]}
				};

				itemCollection.update({destinationCode: destination, code:csvItem[ticketCodeIndex]},
				{'$set': setItem},
				{upsert: false}, function(error) {
					callback (error);
				});
			}],
			//callback for waterfall
			function (error/*, result*/) {
				if (error) {
					log.error ('Error while updating mongo: ' + JSON.stringify(error));
					process.exit(1);
				}
				processedItems++;
				log.info("processed items: " + processedItems);
				// check if finished
				if (processedItems == csvArray.length) {
					process.exit(0);
				}
			}
		);
	});
}
