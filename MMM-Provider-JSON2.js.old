//this.name String The name of the module.
//this.identifier String This is a unique identifier for the module instance.
//this.hidden Boolean This represents if the module is currently hidden(faded away).
//this.config Boolean The configuration of the module instance as set in the user's config.js file. This config will also contain the module's defaults if these properties are not over- written by the user config.
//this.data Object The data object contain additional metadata about the module instance. (See below)

//The this.data data object contain the following metadata:
//	data.classes - The classes which are added to the module dom wrapper.
//	data.file - The filename of the core module file.
//	data.path - The path of the module folder.
//	data.header - The header added to the module.
//	data.position - The position in which the instance will be shown.

Module.register("MMM-Provider-JSON2", {

	defaults: {
		text: "MMM-Provider-JSON2",
		consumerids: ["MMFC1"],
		id: "MMFP1",
		datarefreshinterval: 60000,

		payloadType: "NDTF", //options RSS or NDTF

		oldestAge: null, // – in milliseconds – ignore anything older – default for ever ago / null / none
		youngestAge: null, // – in milliseconds – ignore anything younger than this – default now(null / none)
		Dedup: false, // true/false – remove duplicates, implies tracking
		trackTimestamp: false, // – use timestamp of incoming data true/false
		trackID: false, // – use(pseudo/ hash) id to track data
		trackField: [], // – where to look for the Data(s) to track, defined as json field or hard coded RSS fields

		showDOM: false, // show the data created in the on the MM display, location must be added into the module config if true otherwise MM will error out

		//json-2 specific config options

		jsonSource:
		[
			{
			sourceName: null, // default is the module name and a counter in order of the jsonSources, if present must be unique within the system
			sourceParams: {
				autoFileUse: false, // true/false – use the provided date / time format to determine if a API pull is required
				autoFileFormat: "YYYYMMDD", // – the date format to use for the auto file name, default is YYYYMMDD i.e. daily pull. also hhmmss and even fff for fractions of seconds
				//fraction of seconds i.e. 1 f = 10th of a second, 2 f = 100th of a second, 3 f = 1000th of a second
				//autofilename is sourcename_autoFileFormat.json converted to the actual date/time value i.e. MMM-Provider-JSON2_20231001.json
			},
			url: "", //formatted as http:// or https:// or file:///
			itemfields: [],
			file: null,				// | No | the filename to write the payload to for debug etc purposes | any valid file name | none
			}
		],

	},

	getScripts: function () { 
		return [

		]
	},

	sendNotificationToNodeHelper: function (notification, payload) {
		this.sendSocketNotification(notification, payload);
	},

	start: function () {

		this.templateContent = "Welcome Neil";

		Log.log(this.name + " Started " + this.identifier);

		this.sendNotificationToNodeHelper("CONFIG", { moduleinstance: this.identifier, config: this.config });
		this.sendNotificationToNodeHelper("STATUS", { moduleinstance: this.identifier });

	},

	// we have to override the default setConfig as we will be merging a deep clone !!
	setConfig: function (config) {

		this.config = this.mergeConfigs(this.defaults, config);

		this.config.jsonSource.forEach(source => {
			if (!source.sourceName) {
				source.sourceName = `${this.name}_${this.config.jsonSource.indexOf(source)}`;
			}

		})
	},

	mergeConfigs: function (defaults, config) {

		//basic merge the config and defaults
		var mergedConfig = Object.assign({}, defaults, config);

		//recurse through the merged config looking for any arrays.
		//for each array, use the default values to fill any missing key/value pairs in the array

		Object.keys(mergedConfig).forEach((key) => {
			if (Array.isArray(mergedConfig[key])) {
				mergedConfig[key] = this.fillArrayDefaults(mergedConfig[key], defaults[key][0])
			}
			else if (typeof mergedConfig[key] == 'object') {
				mergedConfig[key] = this.fillObjectDefaults(mergedConfig[key], defaults[key]);
			}
		});

		return mergedConfig;
	},

	fillArrayDefaults: function(array, defaults) {

		if(!Array.isArray(array)) {
			return array;
		}

		return array.map(item => {
			if (typeof item !== 'object' || item === null) {
				return item; // If it's not an object, return it as is
			}
			return this.fillObjectDefaults(item, defaults);
		});
	},

	 fillObjectDefaults: function(config, defaults) {

		//iterate through the items in the object and fill in any missing keys with the defaults recursively
		for (const key in defaults) {
			if (defaults.hasOwnProperty(key)) {
				if (!config.hasOwnProperty(key)) {
					config[key] = defaults[key]; // If the key is missing, add it with the default value
				} else if (Array.isArray(config[key])) {
					config[key] = this.fillArrayDefaults(config[key], defaults[key][0]); // If it's an array, fill it with defaults
				} else if (typeof config[key] === 'object' && config[key] !== null) {
					config[key] = this.fillObjectDefaults(config[key], defaults[key]); // If it's an object, recurse
				}
			}
		}

		return config; // Return the modified object

	},

	myconsumer: function (consumerid) {

		//check if this is one of  my consumers

		if (this.config.consumerids.indexOf(consumerid) >= 0) {
			return true;
		}

		return false;

	},

	notificationReceived: function (notification, payload, sender) {

		if (sender) {
			Log.log(this.name + " received a module notification: " + notification + " from sender: " + sender.name);
		} else {
			Log.log(this.name + " received a system notification: " + notification);
		}

		//if we get a notification that there is a consumer out there, if it one of our consumers, start processing
		//and mimic a response - we also want to start our cycles here - may have to handle some case of multipel restarts to a cycle
		//when we get multiple consumers to look after

		if (notification == 'CONSUMER' && this.myconsumer(payload)) {

			var self = this

			//send an in itail request to get the ball rolling

			this.sendNotificationToNodeHelper("UPDATE", { moduleinstance: this.identifier });

			// set timeout for checking for any new data
			setInterval(() => this.sendNotificationToNodeHelper("UPDATE", { moduleinstance: this.identifier }), this.config.datarefreshinterval);

		}
	},

	socketNotificationReceived: function (notification, payload) {

		if (notification == "NEW_DATA") {
			if (this.identifier == payload.TargetInstanceID) { //only process updates that are for this module instance

				if (this.config.showDOM) {
					this.templateContent = `${JSON.stringify(payload.Payload)}`;
					this.updateDom();
				}

				//convert the node format payload to a consumer format payload
				var modulePayload = new InterModulePayload();
				modulePayload.SourceID = this.identifier; // the module instance that is sending the payload
				modulePayload.TargetID = this.config.consumerids[0]; // the module instance that is receiving the payload / may be a list of them !!
				modulePayload.PayloadType = payload.PayloadType; //options RSS or NDTF
				modulePayload.Payload = payload.Payload; // the payload itself, which is a JSON object

				this.sendNotification('PROVIDER_UPDATE', modulePayload);
				Log.log("Sent some new data @ ");
			}
		}
	},

	getDom() {
		const wrapper = document.createElement("div")
		wrapper.innerHTML = `<b>${this.identifier}</b><br />${this.templateContent}`
		return wrapper
	},

});
