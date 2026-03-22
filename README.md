# MMM-Provider-JSON2

version 2 of the MMM-Provider-JSON module for MagicMirror²
modelled after the MMM-Provider-JSON module 

This module will pull JSON formatted data from web based APIs, or local files (that may have been previously downloaded using this module). It supports standard OUATH2 authentication for web based APIs. Data is formatted into either RSS or NDTF format; NDTF simplifies data to the lowest level, based on a Subject, an Object within that subject and a value. A timestamp is also included (i.e. Country populations, uk, 68123678, 2025-05-01 00:00:00).

That output can then be utilised by other modules that support NDTF, for example MMM-SQLEngine and MMM-Consumer-Display. Further details and examples can be found below.

### Example
![Example of MMM-Consumer-Display output being displayed using data sourced from this module](images/screenshot.png?raw=true "Example screenshot")


### Dependencies

This module requires both MMM-Structures and MMM-Utilities to be installed. Please read their details in Github for any further installation requirements for each of those modules.


## Installation
To install the module, use your terminal to:
1. Navigate to your MagicMirror's modules folder. If you are using the default installation directory, use the command:<br />`cd ~/MagicMirror/modules`
2. Clone the module:<br />`git clone https://github.com/TheBodger/MMM-Utilities`
3. Clone the module:<br />`git clone https://github.com/TheBodger/MMM-Structures`
4. Clone the module:<br />`git clone https://github.com/TheBodger/MMM-Provider-JSON2`

## Using the module


### MagicMirror² Configuration

To use this module, add the following minimum configuration block to the modules array in the `config/config.js` file:
```js

{
module: "MMM-Provider-JSON2",
config:
	{
  	consumerids:['consumerid of MMM-Provider-JSON2 output'],
  	id:'unique id of this module instance',
    		jsonSource:
		      [
          ....enter at least one json source configuration block here, see details below for the jsonSource configuration options
          ]
	}
},
```

### Configuration Options

Note: #these options may not be available in this version of the module.

| Option                  | Details
|------------------------ |--------------
| `text`                	| *Optional* - <br><br> **Possible values:** Any string.<br> **Default value:** The Module name
| `consumerids`            | *Required* - a list of 1 or more consumer modules this module will provide for.<br><br> **Possible values:** An array of strings exactly matching the IDs of one or more consuming modules <br> **Default value:** none
| `id`         | *Required* - The unique ID of this provider module<br><br> **Possible values:** any unique string<br> **Default value:** none
| `datarefreshinterval`         | *Optional* - The time in milliseconds between each pull of the JSON data<br><br> **Possible values:** any valid number of seconds<br> **Default value:** 60000
| `payloadType`         | *Optional* - The format of the output type<br><br> **Possible values:** "NDTF" or "RSS"<br> **Default value:** "NDTF"
| `showDOM`         | *Optional* - Show the output data on the MM display. Position must be included in the module config<br><br> **Possible values:** true or false<br> **Default value:** false
| `#oldestAge`         | *Optional* - If entered, any data as defined by the timestamp field, older than this value in milliseconds will be ignored.<br><br> **Possible values:** null, or any valid number of milliseconds<br> **Default value:** null
| `#youngestAge`         | *Optional* - If entered, any data as defined by the timestamp field, younger than this value in milliseconds will be ignored.<br><br> **Possible values:** null, or any valid number of milliseconds<br> **Default value:** null
| `#Dedup`         | *Optional* - Does'nt send duplicate data.<br><br> **Possible values:** true or false<br> **Default value:** false
| `#trackTimestamp`         | *Optional* - Use the timestamp of the data for processing.<br><br> **Possible values:** true or false<br> **Default value:** false
| `#trackID`         | *Optional* - Create HASH value to track data.<br><br> **Possible values:** true or false<br> **Default value:** false
| `#trackField`         | *Optional* - List of Data to track as a json field.<br><br> **Possible values:** a list of fields<br> **Default value:** []
| `jsonSource`         | *Required* - List of JSON Sources to pull and process and pass on.<br><br> **Possible values:** a list of jsonSources<br> **Default value:** none
|		`jsonSource` fields| Details:<br><br>
| `sourceName`         | *Optional* - A name to identify the output to other modules.<br><br> **Possible values:** null or any unique value<br> **Default value:** the module name and a counter in order of the jsonSources
| `usePagination`         | *Optional* - If the address (url or filename) of the data to pull contains a pagination value (i.e. batch number).<br><br> **Possible values:** true or false<br> **Default value:** false
| `paginationStart`         | *Optional* - The first value to use and increment from.<br><br> **Possible values:** A valid numeric value<br> **Default value:** 1
| `paginationInc`         | *Optional* - How much to increment the pagination value each time a succesful pull occurs .<br><br> **Possible values:** A valid numeric value<br> **Default value:** 1
| `paginationRepl`         | *Optional* - The string embedded in the address to replace with the pagination value.<br><br> **Possible values:** any value delimited with %<br> **Default value:** %pag%
| `url`         | *Required* - The address of this source. Either http:// or https:// or file:///.<br><br> **Possible values:** any valid address starting with the allowed data types<br> **Default value:** none
| `file`         | *Optional* - If entered, the raw JSON data pulled will be written to this file. Can be used as input or debug purposes.<br><br> **Possible values:** any valid filename in format (./path/subpath/)filename.extension<br> **Default value:** null		
| `OAuth2 options – per source`| Details:
| `OAUTH2_Required`         | *Optional* - If true, OAUTH validation will be attempted with the following fields, all are required.<br><br> **Possible values:** true or false<br> **Default value:** false
| `OAUTH2_ID`         | *Required for OAUTH2 only* - The oauth2 id provided by the api provider<br><br> **Possible values:** a valid OAUTH2 id<br> **Default value:** none
| `OAUTH2_Secret`         | *Required for OAUTH2 only* - The oauth2 secret provided by the api provider<br><br> **Possible values:** a valid OAUTH2 secret<br> **Default value:** none
| `OAUTH2_URL`         | *Required for OAUTH2 only* - The oauth2 url fully formed to obtain the bearer token<br><br> **Possible values:** a valid OAUTH2 url<br> **Default value:** none
| `sourceParams`         | *Optional* - Additional options for this source<br><br> **Possible values:** one or more of these values {}<br> **Default value:** {} (i.e. empty)
| `autoFileUse`         | *Optional* - If true, autofile processing will be applied to this source <br><br> **Possible values:** true or false<br> **Default value:** false
| `autoFileFormat`        | *Optional* - A date format that defines how often the JSONsource url should be pulled. <br><br> **Possible values:** YYYYMMDD, hhmmss or fraction of seconds<br> **Default value:** ""YYYYMMDD"   
| |	YYYYMMDD, daily pull 
| | #hhmmss (hours, minutes or seconds)
| | #fff for fractions of seconds
|	|	fraction of seconds i.e. 1 f = 10th of a second, 2 f = 100th of a second, 3 f = 1000th of a second
|	|	autofilename is sourcename_jsonsourceindex_autoFileFormat.json converted to the actual date/time value i.e. MMM-Provider-JSON2_0_20231001.json for YYYYMMDD format on 1st October 2023, or MMM-Provider-JSON2_1_153000.json for hhmmss format at 3pm and 30 minutes. 
| |
| `itemfields `| *Required* - A single defintion of the input/output field processing within a list [].<br><br> **Possible values:** See below for examples<br> **Default value:** none
| `useSubjectKey `| *Optional* - If true, the field defined as the subject will be filled with json data, otherwise the value below will be used<br><br> **Possible values:** true or false<br> **Default value:** false
| `fieldsNullable `| *Optional* - If false, any field containing a null will cause the record to be ignored <br><br> **Possible values:** true or false<br> **Default value:** false
| `root `| *Optional* - A Json level definition indicating where all subsequent field definitions should start at<br><br> **Possible values:** any json level definition<br> **Default value:** ""
| `type `| *Optional* - the type of Json data to process below the root<br><br> **Possible values:** "array" or any other value<br> **Default value:** "array"
| `subject `| *Required* - The value for the Subject field, or a JSON field definition if useSubjectKey is true <br><br> **Possible values:** "subject name" or json field definition<br> **Default value:** none
| `value `| *Required* - The JSON field definition for the value <br><br> **Possible values:** json field definition<br> **Default value:** none
| `object `| *Required* - The JSON field definition for the object <br><br> **Possible values:** json field definition<br> **Default value:** none
| `timestamp `| *Optional* - The JSON field definition for the timestamp <br><br> **Possible values:** json field definition<br> **Default value:** the current time and date
| `useMatchKey `| *Optional* - If true, a field can be matched with a hardcoded value, if matching then that data will be included<br><br> **Possible values:** true or false<br> **Default value:** false
| `matchKey `| *Required if useMatchKey true* - A json field definition within the incoming json record<br><br> **Possible values:** A valid JSON defintion<br> **Default value:** none
| `matchValue `| *Required if useMatchKey true* - A hardcoded value to match with the values in the field named matchKey<br><br> **Possible values:** Any string<br> **Default value:** none


### pagination support

The pagination currently only supports apis that will return an HTTP status code of 404 if the number of the page passed to it doesnt exist and have sequential page numbers. Any other error will trigger a failure of that specific process. Other APIs may return the number of additional pages available in the set, or a starting offset and number of items left. These are not supported yet.

### JSON field definitions

The processor will determine the contents of a JSON Field by using the defintion with the following options:

1) base dot notification, i.e. data.rolls.manager would look for the value in the incoming JSON data at data, then rolls within that, then manager within that and return the value of that field. 
2) Single Array entry definition, i.e. person.rolls.1.skills would look for the value in the incoming JSON data at person, then rolls within that, then return the second entry in an array (0 based list) of skills each person has, assuming that 2nd entry exists<br>
3a) All entries (match key only) i.e. person.rolls.*.skills when processing the array of data.rolls, for all entries there will be a person and one or more skills, and one or more years with that skill  if the match key is looking for a skill of manager, then a succesful match and offset in the array will be returned for that match.<br>
3b) A found entry in a match key scenario i.e. person.rolls.?.years when processing the array of data.rolls, if the match key is succesful, then the value returned will be the years of that skill that manager has. If no matches are made then that manager wont be included<br>

### Example configuration

this configuration produces multiple NDTF feeds from the UK Government fuel price data API. each output requires a separate jsonsource with a single itemfields definition. The output data is passed through the module SQLengine to format it ready for displaying through consumer-display

The complete config for the 3 modules is included in config.js.fuelFinder downloaded with this module.

```
{
			module: "MMM-Provider-JSON2",
			//position: "top_left",
			config:
			{
				text: "MMM-Provider-JSON2",
				consumerids: ["MMSE1"],
				id: "MMJP21",
				showDOM: false,
				datarefreshinterval: 1000 * 60 * 60 * 24, //daily
				payloadType: "NDTF",

				jsonSource:
					[
						//test -- petrol API URLs - note OAUTH details are different to production

						//{
						//	url: "https://stg.fuel-finder.ics.gov.uk/api/v1/pfs/fuel-prices?batch-number=1", //free gov.uk fuel prices database - currently under development and not complete in data content (march 2026)
						//	OAUTH2_Required: true,
						//	OAUTH2_URL: "https://stg.fuel-finder.ics.gov.uk/api/v1/oauth/generate_access_token",
						//	OAUTH2_ID: "test id",
						//	OAUTH2_Secret: "test secret",

						//production

						{
							url: "https://www.fuel-finder.service.gov.uk/api/v1/pfs?batch-number=%pag%", //note the pagination marker that will be replaced until a failure occurs on the page fetch, incremented by default of 1 starting at default of 1.
							OAUTH2_Required: true,
							OAUTH2_URL: "https://www.fuel-finder.service.gov.uk/api/v1/oauth/generate_access_token",
							OAUTH2_ID: "your-Oauth-id",
							OAUTH2_Secret: "your-Oauth-secret",
							itemfields: //note: this returns a set of {subject: "Station_Postcodes", object: node_id value, value: location.postcode value,timestamp: iso date = now} for each entry in the array of data returned from the API
								[
									{
										"useSubjectKey": false,
										"fieldsNullable": false,
										"useMatchKey": false, // this ensures ALL data is returned in the output feed.
										"matchKey": "",
										"matchValue": "",
										"root": "", //note that this data starts immediatly, often the data that is required can be in a paritcular subsey of a larger data set returned by the API
										"type": "array",
										"subject": "Station_Postcodes", 
										"object": "node_id",
										"value": "location.postcode",
									},
								],
							file: "",
							usePagination: true,
							sourceParams: {
								autoFileUse: true,
							},
						},
						{
							url: "https://www.fuel-finder.service.gov.uk/api/v1/pfs?batch-number=%pag%", //note the pagination marker that will be replaced until a failure occurs on the page fetch, incremented by 1
							OAUTH2_Required: true,
							OAUTH2_URL: "https://www.fuel-finder.service.gov.uk/api/v1/oauth/generate_access_token",
							OAUTH2_ID: "your-Oauth-id",
							OAUTH2_Secret: "your-Oauth-secret",
							itemfields:
								[
									{
										"useSubjectKey": false,
										"fieldsNullable": false,
										"useMatchKey": false,
										"matchKey": "",
										"matchValue": "",
										"root": "",
										"type": "array",
										"subject": "Station_Address",
										"object": "node_id",
										"value": "location.address_line_1",
									},
								],
		
							usePagination: true,
							sourceParams: {
								autoFileUse: true,
							},
						},
						{
							url: "https://www.fuel-finder.service.gov.uk/api/v1/pfs?batch-number=%pag%", //note the pagination marker that will be replaced until a failure occurs on the page fetch, incremented by 1
							OAUTH2_Required: true,
							OAUTH2_URL: "https://www.fuel-finder.service.gov.uk/api/v1/oauth/generate_access_token",
							OAUTH2_ID: "your-Oauth-id",
							OAUTH2_Secret: "your-Oauth-secret",
							itemfields:
								[
									{
										"useSubjectKey": false,
										"fieldsNullable": false,
										"useMatchKey": false,
										"matchKey": "",
										"matchValue": "",
										"root": "",
										"type": "array",
										"subject": "Station_City",
										"object": "node_id",
										"value": "location.city",
									},
								],
							file: "",
							usePagination: true,
							sourceParams: {
								autoFileUse: true,
							},
						},

						{
							url: "https://www.fuel-finder.service.gov.uk/api/v1/pfs/fuel-prices?batch-number=%pag%", 
							OAUTH2_Required: true,
							OAUTH2_URL: "https://www.fuel-finder.service.gov.uk/api/v1/oauth/generate_access_token",
							OAUTH2_ID: "your-Oauth-id",
							OAUTH2_Secret: "your-Oauth-secret",
							itemfields:
								[
									{
										"useSubjectKey": false,
										"fieldsNullable": false,
										"useMatchKey": true,
										"matchKey": "fuel_prices.*.fuel_type", //note use of *, means search all of these values to get a match when processing each entry in the set
										"matchValue": "E10", //note only those entries in each single data set from the API array of fuel_prices within the overall array with a field of fuel_type with a value of E10 will be included in the output feed
										"root": "",
										"type": "array",
										"subject": "E10_Prices",
										"object": "node_id",
										"value": "fuel_prices.?.price", //note use of .?. if a match occurs this will be replaced by the offset into the array that matched above
										"timestamp": "fuel_prices.?.price_change_effective_timestamp",//note use of .?. if a match occurs this will be replaced by the offset into the array that matched
									},
								],
		
							usePagination: true,
							sourceParams: {
								autoFileUse: true,
							},
						},

						{
							url: "https://www.fuel-finder.service.gov.uk/api/v1/pfs/fuel-prices?batch-number=%pag%", 
							OAUTH2_Required: true,
							OAUTH2_URL: "https://www.fuel-finder.service.gov.uk/api/v1/oauth/generate_access_token",
							OAUTH2_ID: "your-Oauth-id",
							OAUTH2_Secret: "your-Oauth-secret",
							itemfields:
								[
									{
										"useSubjectKey": false,
										"fieldsNullable": false,
										"useMatchKey": true,
										"matchKey": "fuel_prices.*.fuel_type", 
										"matchValue": "B7_STANDARD", //note that this creates a set of diesel prices from the same api as above - this is ineffecient but using autofileuse minimises future calls to the APIs
										"root": "",
										"type": "array",
										"subject": "Diesel_Prices",
										"object": "node_id",
										"value": "fuel_prices.?.price", 
										"timestamp": "fuel_prices.?.price_change_effective_timestamp",
									},
								],
		
							usePagination: true,
							sourceParams: {
								autoFileUse: true,
							},
						}, 
					],
			},
		},

```

This example pulls data from a shares API and currency file previously loaded from an API. The feeds are later merged in sqlengine to produce a feed that shows the price of the shares in the local currency.

The example config is included as exampleconfig.js in the module folder.

```
jsonSource:
					[
          {
			      url: "https://query1.finance.yahoo.com/v8/finance/chart/TJX?range=5d&interval=1d&events=close", //very specific request to get the closing share price for TJX
			      itemfields: [
				      {
					      "useSubjectKey": false,
					      "root": "chart.result",
					      "type": "array",
					      "subject": "ShareClose",
					      "object": "meta.symbol",
					      "value": "indicators.quote.0.close", //note the .0 anywhere indicate the first entry in an array
					      "timestamp": "timestamp", //note this may return an array which needs to be processed alongside any other items returned as array
				      },
			      ],
			      file: "TJX.json", //this is a file that will be created for debug purposes, can also be input to this process

			      sourceParams: {
				      autoFileUse: true,
			      },

		      },

		      {
			      url: "file:///GBP.json", //this is a previously saved file from an API call to a currency exchange rate API, it is included to show alternative input types
			      itemfields:
			      [
				      {
					      "useSubjectKey": false,
					      "root": "",
					      "type": "",
					      "subject": "GBExchange",
					      "object": "source",
					      "value": "quotes.USDGBP",
					      "timestamp": "timestamp",
				      },

			      ],
		      },
        ],

```

### Additional Notes

This is a WIP; changes are being made all the time to improve the compatibility across the modules. Please refresh this and the other modules noted above, by using `git pull` in the relevant module's folder.

The JSON input must be well formed and capable of being parsed with JSON.parse(). If there are errors generated whilst trying to parse the JSON, there are plenty of on-line tools that can be used to validate the feed and indicate where the issue may occur.

Look out for the correct key name/value name pairs for output purposes and a valid format for a timestamp.


