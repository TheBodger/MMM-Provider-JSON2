/* global Module, MMM-Provider-JSON2 */

/* Magic Mirror
 * Module: node_helper
 *
 * By Neil Scott
 * MIT Licensed.
 */


//if the module calls a RESET, then the date tracking is reset and all data will be sent

//nodehelper stuff:
//this.name String The name of the module

const NodeHelper = require("node_helper");

const Structures = require("../MMM-structures/MMM-structures.js")
const Utilities = require("../MMM-utilities/MMM-utilities.js");

//JSON2 stuff

const http = require('node:http')
const https = require('node:https')

const fs = require("node:fs");

// 

module.exports = NodeHelper.create({

  start: function () {
		this.configurations = new Structures.Configurations();
		this.payloadTracker = new Structures.PayloadTracker();
		this.debug = false;
		this.payloads = [];
		console.log(this.name + ' node_helper is started!');
		},

	stop: function () {
		console.log("Shutting down node_helper");
		this.connection.close();
	},

	setconfig: function (moduleinstance, config) {

		var self = this;

		this.configurations.addConfiguration(moduleinstance, config);

		this.payloadTracker.addTracker(moduleinstance);

		this.payloads[moduleinstance] = new Structures.NodePayload(config.payloadType,moduleinstance,config.id);

	},

	socketNotificationReceived: function (notification, payload) {

		var self = this;

		console.log('Node Notification: ' + notification + ", Module:" + payload.moduleinstance);

		switch (notification) {
			case "CONFIG":
				this.setconfig(payload.moduleinstance, payload.config);
				break;
			case "STATUS":
				this.showstatus(payload.moduleinstance);
				break;
			case "UPDATE":
				this.process(payload.moduleinstance);
				break;
		}

	},

	sendUpdate: function (notification, payload) {
		this.sendSocketNotification(notification,payload)
	},

	showstatus: function (moduleinstance) {

		console.log('============================ start of status ========================================');

		console.log('config for provider: ' + moduleinstance);

		console.log(this.configurations.clone(moduleinstance));

		console.log('============================= end of status =========================================');
	},

	process: function (moduleinstance) {

		const self = this;

		const options = {
			headers: {
				"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
				"Accept-Encoding": "deflate, br, zstd", //gzip, 
				"Accept-Language": "en-GB,en;q=0.9,en-US;q=0.8",
				"Dnt": "1",

				"Priority": "u=0, i",
				"Sec-Ch-Ua": "\"Microsoft Edge\";v=\"137\", \"Chromium\";v=\"137\", \"Not/A)Brand\";v=\"24\"",
				"Sec-Ch-Ua-Mobile": "?0",
				"Sec-Ch-Ua-Platform": "\"Windows\"",
				"Sec-Fetch-Dest": "document",
				"Sec-Fetch-Mode": "navigate",
				"Sec-Fetch-Site": "none",
				"Sec-Fetch-User": "?1",
				"Upgrade-Insecure-Requests": "1",
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 Edg/137.0.0.0",
				"X-Amzn-Trace-Id": "Root=1-6840cccb-419701ed64dbd17404327ef4"
			}
		};

		this.configurations.configuration[moduleinstance].jsonSource.forEach(function (jsonsource) {

			var URL = jsonsource.url;
			var tURL = null

			jsonsource.sourceParams.useAutoFile = false; //assume we are going to call API

			if (jsonsource.sourceParams.autoFileUse) //check if there is a current autoFile in place to use

			{
				tURL = Utilities.getAutoFileName(jsonsource.sourceName, jsonsource.sourceParams.autoFileFormat);
				//console.log("Using auto file: " + URL);
				jsonsource.sourceParams.useAutoFile = Utilities.autoFileExists(tURL); //check if the file exists for required date/time
				if (jsonsource.sourceParams.useAutoFile) {
					URL = tURL; //use the auto file name
				}

			}

			if (URL.substring(0, 5) == 'file:') {
				this.agent = new Utilities.file();
			}
			else if (URL.substring(0, 6) == 'https:') {
				this.agent = https;
			}
			else {
				this.agent = http;
			}

			this.agent.get(URL, options, res => {

				let sourceHost = res.client._host;
				const headerDate = res.headers && res.headers.date ? res.headers.date : 'no response date';

				console.log('Status Code:', res.statusCode + " " + URL);
				console.log('Date in Response header:', headerDate);

				let rawData = '';

				res.on('data', chunk => {
					rawData += chunk;
				});

				res.on('end', () => {
					
					try {

						const JSONData = JSON.parse(rawData);
						
						if (jsonsource.file && jsonsource.file != "")
						{
							fs.writeFile(jsonsource.file, JSON.stringify(JSONData), err => {
								if (err) {
									console.error(err);
								} else {
									console.log("Written JSON File: " + jsonsource.file);
								}
							});
						}

						if (jsonsource.sourceParams.autoFileUse && !jsonsource.sourceParams.useAutoFile) //no auto file available
						{
							//create the auto file for the next time
							tURL = tURL.replace(/^file:\/{3}/, "");
							fs.writeFile(tURL, JSON.stringify(JSONData), err => {
								if (err) {
									console.error(err);
								} else {
									console.log("Written autoUseFile : " + tURL);
								}
							});
						}

						self.update(moduleinstance, JSONData, jsonsource.itemfields, sourceHost);

					} catch (e) {
						console.error(e.message);
					}

				});

				//}).on('error', (err) => {
				//	console.log('Error: ', err.message);
			});
		}) //loop through the jsonsource
	},

	update: function (moduleinstance, data, itemfields, sourceURL) {

		//process the actual data here and return to main module.
		//adjust the call to process if this is to be used for other data types

		const self = this;

		this.payloads[moduleinstance].Payload.timestamp = new Date().toISOString(); // the time the RSS feed was last updated

		//RSS

		if (this.configurations.configuration[moduleinstance].payloadType == "RSS")
		{
			
			var title = "Testing RSS Item";
			var pubdate = new Date().toISOString();
			pubdate = new Date("2025-01-01").toISOString(); //force the same data so key is same so only 1 item is added

			var RSSItem = new Structures.RSSItem();

			//key

			RSSItem.id = RSSItem.gethashCode(title + pubdate);

			//check the tracker to see if this item has been sent before

			if (!this.payloadTracker.addItem(moduleinstance, RSSItem.id)) {
				console.log("Adding RSS Item: " + RSSItem.id);

				RSSItem.Title = title;
				RSSItem.PubDate = pubdate; // the time the RSS feed was last updated
				RSSItem.Description = "This is a test RSS item";

				this.payloads[moduleinstance].Payload.RSSFeedSource = moduleinstance;
				this.payloads[moduleinstance].Payload.Items.push(RSSItem);
			}

		}

		//NDTF

		if (this.configurations.configuration[moduleinstance].payloadType == "NDTF")
		{

			this.payloads[moduleinstance].Payload.JSONsource = sourceURL;

			itemfields.forEach(function (itemfield) 
			{

				//null root mean data is provided ar root
				//type of array means that there are multiple items to be processedd below the root

				itemsubject = itemfield.subject; //may not be taken from incoming data
				itemobject = itemfield.object;//may not be taken from incoming data
				itemtimestamp = itemfield.timestamp;
				itemvalue = "";

				//use a root value to get the actual data to process

				var JSONData = data;

				if (itemfield.root && itemfield.root != "") {
					JSONData = Utilities.getkeyedJSON(data,itemfield.root);
				}

				if (itemfield.type == "array") {
					JSONData.forEach(function (obj) {

						self.processJSONitem(obj, itemfield, moduleinstance);

					})

				}
				else { //not an array

					self.processJSONitem(JSONData, itemfield, moduleinstance);

				}

			})
		}

		var newpayload = this.payloads[moduleinstance].clone();

		//here we track the payload items to ensure that only unsent items are sent to the consumer, and mark them as sent
		newpayload.Payload = Utilities.trackPayloadItems(newpayload, this.payloadTracker, moduleinstance);

		//if the payload is empty, then we do not send it

		if ((newpayload.Payload.Items && newpayload.Payload.Items.length > 0) || (newpayload.Payload.NDTF && newpayload.Payload.NDTF.length > 0)) {
			this.sendUpdate("NEW_DATA", newpayload);
		}
	},

	processJSONitem: function (obj, itemfield, moduleinstance) {

		if (itemfield.timestamp) {
			itemtimestamp = Utilities.getkeyedJSON(obj, itemfield.timestamp);
		}//may not be present

		itemvalue = obj[itemfield.value];

		if (itemfield.value != null) {
			var itemvalue = Utilities.getkeyedJSON(obj, itemfield.value);
		}

		itemobject = Utilities.getkeyedJSON(obj, itemfield.object);

		if (itemfield.useSubjectKey) { itemsubject = Utilities.getkeyedJSON(obj, itemfield.subject); }

		//if any returned field is an array, then all fields that are arrays need to be aligned and
		//multiple items added to the payload

		//is any one an array ?

		var processArrayCount = 1;

		[processArrayCount, itemvalue] = this.checkFieldArray(processArrayCount, itemvalue);
		[processArrayCount, itemobject] = this.checkFieldArray(processArrayCount, itemobject);
		[processArrayCount, itemtimestamp] = this.checkFieldArray(processArrayCount, itemtimestamp);
		[processArrayCount, itemsubject] = this.checkFieldArray(processArrayCount, itemsubject);

		//code assumes that each entry if an array will simply add the next entry
		//until the minimum entries have been added

		for (let i = 0; i < processArrayCount; i++) {

			var NDTFItem = new Structures.NDTFItem();

			NDTFItem.subject = itemsubject;
			if (Array.isArray(itemsubject)) {
				NDTFItem.subject = itemsubject[i];
			}

			NDTFItem.object = itemobject;
			if (Array.isArray(itemobject)) {
				NDTFItem.object = itemobject[i];
			}

			NDTFItem.timestamp = itemtimestamp;
			if (Array.isArray(itemtimestamp)) {
				NDTFItem.timestamp = itemtimestamp[i];
			}

			NDTFItem.value = itemvalue;
			if (Array.isArray(itemvalue)) {
				NDTFItem.value = itemvalue[i];
			}

			//check if we have already sent this item

			var key = NDTFItem.gethashCode(NDTFItem.subject + NDTFItem.object + NDTFItem.timestamp); //can include value if really needed

			if (!this.payloadTracker.addItem(moduleinstance, key)) {

				this.payloads[moduleinstance].Payload.NDTF.push(NDTFItem);
				this.payloads[moduleinstance].Payload.keys.push(key);
			}

		}
	},

	checkFieldArray: function (processArrayCount, item) {

		if (Array.isArray(item)) {
			if (item.length < 2) {
				//if only one item in the array, then just use that item
				if (item.length == 1) { item = item[0]; }
				else { item = ""; }
			}
			else
				// get the minimum lowest array length of all arrays left

				if (processArrayCount == 1) { processArrayCount = item.length; }
				else { processArrayCount = Math.min(item.length, processArrayCount) }
		}

		return [processArrayCount, item];
	}

});
