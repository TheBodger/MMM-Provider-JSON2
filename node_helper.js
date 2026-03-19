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

const Structures = require("../MMM-Structures/MMM-Structures.js")
const Utilities = require("../MMM-Utilities/MMM-Utilities.js");

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

		this.payloads[moduleinstance] = new Structures.NodePayload(config.payloadType, moduleinstance, config.id);

		this.clearFiles(moduleinstance);

	},

	clearFiles: function (moduleinstance) {

		//if any of the jsonSources are written to file, clear them first

		this.configurations.configuration[moduleinstance].jsonSource.forEach(function (jsonsource) {

			if (jsonsource.file && jsonsource.file != "") {
				fs.writeFile(jsonsource.file, "", err => { });
			}

		});

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
		this.sendSocketNotification(notification, payload)
	},

	showstatus: function (moduleinstance) {

		console.log('============================ start of status ========================================');

		console.log('config for provider: ' + moduleinstance);

		console.log(this.configurations.clone(moduleinstance));

		console.log('============================= end of status =========================================');
	},

	// -------------------------------------------------------------------------
	// OAuth2: fetch a Bearer token for a single jsonSource entry.
	// Reads OAUTH2_ID, OAUTH2_Secret and OAUTH2_URL from the jsonsource object.
	// Returns a Promise that resolves with the access_token string, or rejects
	// with a descriptive Error on any failure.
	// -------------------------------------------------------------------------
	getOAuth2Token: function (jsonsource) {

		return new Promise((resolve, reject) => {

			const postBody = JSON.stringify({
				client_id:     jsonsource.OAUTH2_ID,
				client_secret: jsonsource.OAUTH2_Secret
			});

			const oauthURL = new URL(jsonsource.OAUTH2_URL);
			const useHttps = oauthURL.protocol === 'https:';
			const agent    = useHttps ? https : http;

			const options = {
				hostname: oauthURL.hostname,
				port:     oauthURL.port || (useHttps ? 443 : 80),
				path:     oauthURL.pathname + oauthURL.search,
				method:   'POST',
				headers: {
					'Content-Type':    'application/json',
					'Content-Length':  Buffer.byteLength(postBody),
					'Accept':          'application/json',
					'Accept-Language': 'en-GB,en;q=0.9,en-US;q=0.8',
					'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 Edg/137.0.0.0',
					'Sec-Fetch-Site':  'none',
					'Sec-Fetch-Mode':  'navigate',
					'Sec-Fetch-Dest':  'document',
					'Dnt':             '1'
				}
			};

			const req = agent.request(options, (res) => {

				let rawData = '';
				res.on('data', chunk => { rawData += chunk; });
				res.on('end', () => {

					console.log(this.name + ' OAuth2 status for "' + jsonsource.sourceName + '": ' + res.statusCode);

					if (res.statusCode !== 200) {
						reject(new Error(
							'OAuth2 authentication failed – HTTP ' + res.statusCode +
							'. Response: ' + rawData
						));
						return;
					}

					try {
						const parsed = JSON.parse(rawData);

						if (!parsed.data || !parsed.data.access_token) {
							reject(new Error(
								'OAuth2 response missing access_token. Body: ' + rawData
							));
							return;
						}

						console.log(this.name + ' OAuth2 token acquired for "' + jsonsource.sourceName + '".');
						resolve(parsed.data.access_token);

					} catch (e) {
						reject(new Error('OAuth2 response JSON parse error: ' + e.message));
					}
				});
			});

			req.on('error', (err) => {
				reject(new Error('OAuth2 request error: ' + err.message));
			});

			req.write(postBody);
			req.end();
		});
	},

	// -------------------------------------------------------------------------
	// process: iterate each jsonSource independently. Sources that require
	// OAuth2 fetch their own token before calling the data API; a failure on
	// one source does not block the others.
	// -------------------------------------------------------------------------
	process: function (moduleinstance) {

		const self = this;

		this.configurations.configuration[moduleinstance].jsonSource.forEach(function (jsonsource) {

			// Each source manages its own token lifecycle
			const tokenPromise = jsonsource.OAUTH2_Required
				? self.getOAuth2Token(jsonsource)
				: Promise.resolve(null);

			tokenPromise
				.then((accessToken) => {
					self.fetchSource(moduleinstance, jsonsource, accessToken);
				})
				.catch((err) => {
					console.error(self.name + ' OAuth2 error for source "' + jsonsource.sourceName + '": ' + err.message);
					self.sendUpdate('OAUTH2_ERROR', {
						moduleinstance: moduleinstance,
						sourceName:     jsonsource.sourceName,
						message:        err.message
					});
				});

		}); //loop through the jsonSource
	},

	// -------------------------------------------------------------------------
	// fetchSource: perform the HTTP GET for one jsonSource entry.
	// accessToken is the Bearer token string when OAuth2 was required, or null.
	// -------------------------------------------------------------------------
	fetchSource: function (moduleinstance, jsonsource, accessToken) {

		const self = this;

		// Prevent concurrent fetches for the same source writing simultaneously.
		// The lock is always released in the finally block of fetchAllPages.
		if (jsonsource._fetchInProgress) {
			console.log('fetchSource: skipping run, previous fetch still in progress for ' + jsonsource.sourceName);
			return;
		}
		jsonsource._fetchInProgress = true;

		// Base request headers. Accept-Encoding is deliberately omitted: Node does not
		// auto-decompress responses, so advertising br/gzip causes the server to return
		// compressed binary that cannot be parsed as JSON.
		const baseHeaders = {
			"Accept": "application/json, text/plain, */*",
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
		};

		// Attach the Bearer token only when this source required OAuth2
		if (accessToken) {
			baseHeaders["Authorization"] = "Bearer " + accessToken;
		}

		const options = { headers: baseHeaders };

		var URL = jsonsource.url;
		var tURL = null;

		jsonsource.sourceParams.useAutoFile = false; //assume we are going to call API

		if (jsonsource.sourceParams.autoFileUse) //check if there is a current autoFile in place to use
		{
			tURL = Utilities.getAutoFileName(jsonsource.sourceName, jsonsource.sourceParams.autoFileFormat);
			jsonsource.sourceParams.useAutoFile = Utilities.autoFileExists(tURL); //check if the file exists for required date/time
			if (jsonsource.sourceParams.useAutoFile) {
				URL = tURL; //use the auto file name
			}
		}

		// agent is local to this fetchSource call - never shared between concurrent sources.
		// usePagination is a local copy of the config value so we can override it for
		// file reads without mutating the original config object.
		// File reads are always a single read with no pagination - a file always returns
		// 200 so the API non-200 exit condition would never fire, causing an infinite loop.
		var agent;
		var usePagination = jsonsource.usePagination; // preserve original config value

		if (URL.substring(0, 5) == 'file:') {
			agent = new Utilities.file();
			usePagination = false;        // files are always read exactly once
			jsonsource._currentPag = 1;   // ensure the loop body executes at least once
		}
		else if (URL.substring(0, 6) == 'https:') {
			agent = https;
		}
		else {
			agent = http;
		}

		// Wrap the agent.get call in a promise so we can await it
		const fetchPage = (workingURL, options) => {
			return new Promise((resolve, reject) => {
				agent.get(workingURL, options, res => {
					let sourceHost = res.client._host;
					const headerDate = res.headers && res.headers.date ? res.headers.date : 'no response date';
					console.log('Status Code:', res.statusCode + " " + workingURL);
					console.log('Date in Response header:', headerDate);

					let rawData = '';

					res.on('data', chunk => {
						rawData += chunk;
					});

					res.on('end', () => {
						console.log('>> end Status Code:', res.statusCode + " " + workingURL);
						try {
							let JSONData = null;

							if (res.statusCode === 200) {
								try {
									JSONData = JSON.parse(rawData);
								} catch (parseErr) {
									console.error('JSON parse failed for URL:', workingURL);
									console.error('Parse error message:', parseErr.message);
									console.error('Raw data length:', rawData.length);
									console.error('Raw data preview:', rawData.substring(0, 500));
									// ADD YOUR DEBUG VARIABLES HERE:
									// console.error('jsonsource:', JSON.stringify(jsonsource));
									// console.error('statusCode:', res.statusCode);
									reject(parseErr);
									return;
								}
							}
							resolve({ statusCode: res.statusCode, JSONData, sourceHost });
						} catch (e) {
							console.error(e.message);
							reject(e);
						}
					});

					res.on('error', (err) => {
						console.log('Error: ', err.message);
						reject(err);
					});
				});
			});
		};

		async function fetchAllPages() {

			try {
				const allPages = []; // accumulate all pages in memory first

				while (jsonsource._currentPag > 0) {
					var workingURL = URL;
					if (usePagination) {
						// Adjust the URL for the current page and increment for next time
						workingURL = workingURL.replace(jsonsource.paginationRepl, jsonsource._currentPag);
						jsonsource._currentPag = jsonsource._currentPag + jsonsource.paginationInc;
					}

					try {
						const { statusCode, JSONData, sourceHost } = await fetchPage(workingURL, options);

						// Exit condition: non-200 from API signals no more pages.
						// Also exits immediately when usePagination is false (file reads,
						// or sources configured without pagination).
						if (statusCode !== 200 || !usePagination) {
							jsonsource._currentPag = 0;
						}

						if (statusCode === 200 && JSONData !== null) {
							// JSONData is an array [{...},{...}] - spread into accumulator
							allPages.push(...JSONData);
							// call update per page so display refreshes incrementally
							self.update(moduleinstance, JSONData, jsonsource.itemfields, sourceHost);
						}

					} catch (e) {
						console.error('fetchPage failed:', e.message);
						jsonsource._currentPag = 0; // abort the while loop
					}
				}

				// --- All pages collected, now write to disk once ---

				// writeAccumulatedJSON: read existing file, merge, overwrite.
				// Used only for jsonsource.file (the permanent running record).
				const writeAccumulatedJSON = (filePath, newData) => {
					fs.readFile(filePath, 'utf8', (readErr, existingRaw) => {
						let existingData = [];
						if (!readErr && existingRaw) {
							try {
								existingData = JSON.parse(existingRaw);
								if (!Array.isArray(existingData)) {
									console.error('Existing file is not a JSON array, starting fresh: ' + filePath);
									existingData = [];
								}
							} catch (parseErr) {
								console.error('Could not parse existing file, starting fresh: ' + filePath);
								existingData = [];
							}
						}

						const merged = [...existingData, ...newData];

						fs.writeFile(filePath, JSON.stringify(merged), writeErr => {
							if (writeErr) {
								console.error('Failed to write file: ' + filePath, writeErr);
							} else {
								console.log('Written JSON file (' + merged.length + ' total records): ' + filePath);
							}
						});
					});
				};

				if (allPages.length > 0) {

					// Permanent record file - append new pages to existing data
					if (jsonsource.file && jsonsource.file != "") {
						writeAccumulatedJSON(jsonsource.file, allPages);
					}

					// Auto cache file - only written when we fetched live from the API
					// (useAutoFile is false meaning no valid cache file existed).
					// Always a clean overwrite: it is today's full snapshot, never accumulated.
					// Delete first to guarantee no leftover bytes from a previous write.
					if (jsonsource.sourceParams.autoFileUse && !jsonsource.sourceParams.useAutoFile) {
						const cleanURL = tURL.replace(/^file:\/{3}/, "");
						fs.unlink(cleanURL, () => {
							fs.writeFile(cleanURL, JSON.stringify(allPages), writeErr => {
								if (writeErr) {
									console.error('Failed to write auto file: ' + cleanURL, writeErr);
								} else {
									console.log('Written autoUseFile (' + allPages.length + ' records): ' + cleanURL);
								}
							});
						});
					}
				}

				jsonsource._currentPag = jsonsource.paginationStart; // reset for next run

			} finally {
				// Always release the lock - even if an unexpected error occurred above
				jsonsource._fetchInProgress = false;
			}
		}

		fetchAllPages();
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

				//null root mean data is provided at root
				//type of array means that there are multiple items to be processed below the root

				itemsubject = itemfield.subject; //may not be taken from incoming data
				itemobject = itemfield.object; //may not be taken from incoming data
				itemtimestamp = itemfield.timestamp;
				itemvalue = "";

				//use a root value to get the actual data to process

				var JSONData = data;

				if (itemfield.root && itemfield.root != "") {
					JSONData = Utilities.getkeyedJSON(data, itemfield.root);
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

		//add a check if needed to see if matching is required to process this item
		//"useMatchKey": true,
		//"matchKey": "fuel_prices.*.fuel_type", //note use of *, means search all of these values
		//"matchValue": "E5",

		titemfield_value = itemfield.value; //may need to be adjusted if we are matching within an array
		titemfield_timestamp = itemfield.timestamp; //may need to be adjusted if we are matching within an array

		if (itemfield.useMatchKey) {
			var matchOffset = Utilities.matchkeyedJSON(obj, itemfield.matchKey, itemfield.matchValue)
			if (matchOffset < 0) { return; }
			//now adjust the value key to replace the ? with the match offset so that we get the value from the matched item in the array
			titemfield_value = itemfield.value.replace(".?.", "." + matchOffset + ".");
			titemfield_timestamp = itemfield.timestamp.replace(".?.", "." + matchOffset + ".");
		}

		if (titemfield_timestamp) {
			itemtimestamp = Utilities.getkeyedJSON(obj, titemfield_timestamp);
		} //may not be present, provide a default value or use the time of processing as the timestamp
		else {
			itemtimestamp = new Date().toISOString();
		}

		itemvalue = obj[titemfield_value];

		if (titemfield_value != null) {
			var itemvalue = Utilities.getkeyedJSON(obj, titemfield_value);
		}

		itemobject = Utilities.getkeyedJSON(obj, itemfield.object);

		if (itemfield.useSubjectKey) { itemsubject = Utilities.getkeyedJSON(obj, itemfield.subject); }

		if (!itemfield.fieldsNullable) {
			if (itemsubject == null || itemsubject == "") { return; }
			if (itemtimestamp == null || itemtimestamp == "") { return; }
			if (itemvalue == null || itemvalue == "") { return; }
			if (itemobject == null || itemobject == "") { return; }
		}

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
