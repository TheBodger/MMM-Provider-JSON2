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

const Configurations = require("../MMM-Provider-Consumer-utils/configurations.js");
const PayloadTracker = require("../MMM-Provider-Consumer-utils/payload_tracker.js");
const Payload = require("../MMM-Provider-Consumer-utils/payload.js");

const NDTFstructure = require("../MMM-ChartUtilities/structures.js")

//JSON2 stuff

var http = require('node:http')
var https = require('node:https')

const utilities = require("../MMM-ChartUtilities/common");

// 


module.exports = NodeHelper.create({

  start: function () {
		this.configurations = new Configurations();
		this.payloadTracker = new PayloadTracker();
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

		this.payloadTracker.addTracker(moduleinstance, config);

		this.payloads[moduleinstance] = new Payload.NodePayload(config.payloadType,moduleinstance,config.id);

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

		this.configurations.configuration[moduleinstance].jsonsource.forEach(function (jsonsource) { 

			var URL = jsonsource.url;

			if (URL.substring(0, 5) == 'https') {
				this.agent = https;
			}
			else {
				this.agent = http;
			}

			//this.agent.headers = {
			//	"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
			//	"Accept-Encoding": "gzip, deflate, br, zstd",
			//	"Accept-Language": "en-GB,en;q=0.9,en-US;q=0.8",
			//	"Dnt": "1",
			//	"Host": "httpbin.org",
			//	"Priority": "u=0, i",
			//	"Sec-Ch-Ua": "\"Microsoft Edge\";v=\"137\", \"Chromium\";v=\"137\", \"Not/A)Brand\";v=\"24\"",
			//	"Sec-Ch-Ua-Mobile": "?0",
			//	"Sec-Ch-Ua-Platform": "\"Windows\"",
			//	"Sec-Fetch-Dest": "document",
			//	"Sec-Fetch-Mode": "navigate",
			//	"Sec-Fetch-Site": "none",
			//	"Sec-Fetch-User": "?1",
			//	"Upgrade-Insecure-Requests": "1",
			//	"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 Edg/137.0.0.0"
			//};

			const options = {
				headers: {
					"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
					"Accept-Encoding": "gzip, deflate, br, zstd",
					"Accept-Language": "en-GB,en;q=0.9,en-US;q=0.8",
					"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 Edg/137.0.0.0"
				}
			};

			this.agent.get(URL, options, res => {
				let data = [];
				const headerDate = res.headers && res.headers.date ? res.headers.date : 'no response date';
				console.log('Status Code:', res.statusCode + " " + URL);
				console.log('Date in Response header:', headerDate);

				res.on('data', chunk => {
					data.push(chunk);
				});

				res.on('end', () => {
					
					const JSONData = JSON.parse(Buffer.concat(data).toString());
					console.log('Response ended: ');
					self.update(moduleinstance, JSONData, jsonsource.itemfields);

				});
				}).on('error', err => {
					console.log('Error: ', err.message);
			});
		})
	},

	update: function (moduleinstance, data,itemfields) {

		//process the actual data here and return to main module.
		//adjust the call to process if this is to be used for other data types

		const self = this;

		this.payloads[moduleinstance].Payload.timestamp = new Date().toISOString(); // the time the RSS feed was last updated

		//RSS

		if (this.configurations.configuration[moduleinstance].payloadType == "RSS")
		{
			this.payloads[moduleinstance].Payload.RSSFeedSource = moduleinstance;
			this.payloads[moduleinstance].Payload.Items.push({ "ITEM": moduleinstance });
			this.payloads[moduleinstance].Payload.Items.push({ "fred": "george" });
		}

		//NDTF

		if (this.configurations.configuration[moduleinstance].payloadType == "NDTF")
		{
			//loop for each set of itemfields found in the configuration
			//option 2 - subject = keyvalue (i.e. id or name, object = key name, value is value)

			//i.e. subject:fred,object:age,value:30,timestamp:2023-10-01T12:00:00Z (fred was 30 on this date))
			//allows to create multiple entries that can be merged (usign the sets stuff in NDTF))

			//unpack the json data from data if required here
			//this.configurations.configuration[moduleinstance].itemfields = [{ "useSubjectKey": false, "root": "", "type": "array", "object": "name", "subject": "users", "timestamp": "" }]; // this is the list of fields in the data that map to to be used in the NDTF structure

			// process the data against config requested

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
					JSONData = utilities.getkeyedJSON(data,itemfield.root);
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

		newpayload.Payload = this.trackPayloadItems(this.payloads[moduleinstance]); 

		this.sendUpdate("UPDATED_STUFF", newpayload);
	},

	trackPayloadItems: function (moduleInstancePayload) {

		//will ensure that only unsent payload itesm are sent to the consumer

		var newpayload = moduleInstancePayload.Payload.clone();

		if (moduleInstancePayload.PayloadType == "NDTF") {
			//as we are deleting from array using an index need to do this in reverse order to avoid index issues

			for (let itemIdx = newpayload.ItemsSent.length-1; itemIdx >= 0; itemIdx--) {

				if (moduleInstancePayload.Payload.ItemsSent[itemIdx]) {
					newpayload.NDTF.splice(itemIdx, 1); // remove the specific item from output from the payload

				}
				else {
					moduleInstancePayload.Payload.ItemsSent[itemIdx] = true; // mark the item as sent
					newpayload.ItemsSent[itemIdx] = true;
				}

			}
		}

		return newpayload;
	},

	processJSONitem: function (obj, itemfield, moduleinstance) {

		if (itemfield.timestamp) {
			itemtimestamp = utilities.getkeyedJSON(obj, itemfield.timestamp);
		}//may not be present

		itemvalue = obj[itemfield.value];

		if (itemfield.value != null) {
			var itemvalue = utilities.getkeyedJSON(obj, itemfield.value);
		}

		itemobject = utilities.getkeyedJSON(obj, itemfield.object);

		if (itemfield.useSubjectKey) { itemsubject = utilities.getkeyedJSON(obj, itemfield.subject); }

		//if any returned field is an array, then all fields that are arrays need to be aligned and
		//multiple items added to the payload

		//is any one an array ?

		var processArrayCount = 1;

		if (Array.isArray(itemvalue)) {
			processArrayCount = itemvalue.length;
		}

		if (Array.isArray(itemtimestamp)) {
			if (processArrayCount == 1) {
				processArrayCount = itemtimestamp.length;
			}
			else {
				processArrayCount = Math.min(itemtimestamp.length, processArrayCount);
			}
		}

		//code assumes that each entry if an array will simply add the next entry
		//until the minimum entries have been added

		for (let i = 0; i < processArrayCount; i++) {

			var ndftitem = new NDTFstructure.NDTFItem()

			ndftitem.object = itemobject;
			ndftitem.subject = itemsubject;

			ndftitem.timestamp = itemtimestamp;
			if (Array.isArray(itemtimestamp)) {
				ndftitem.timestamp = itemtimestamp[i];
			}

			ndftitem.value = itemvalue;
			if (Array.isArray(itemvalue)) {
				ndftitem.value = itemvalue[i];
			}

			this.payloads[moduleinstance].Payload.NDTF.push(ndftitem);
			this.payloads[moduleinstance].Payload.ItemsSent.push(false);
		}
	}

});
