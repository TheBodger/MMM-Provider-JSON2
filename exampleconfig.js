/* Config Sample
 *
 * For more information on how you can configure this file
 * see https://docs.magicmirror.builders/configuration/introduction.html
 * and https://docs.magicmirror.builders/modules/configuration.html
 *
 * You can use environment variables using a `config.js.template` file instead of `config.js`
 * which will be converted to `config.js` while starting. For more information
 * see https://docs.magicmirror.builders/configuration/introduction.html#enviromnent-variables
 */
let config = {
	address: "localhost",	// Address to listen on, can be:
	// - "localhost", "127.0.0.1", "::1" to listen on loopback interface
	// - another specific IPv4/6 to listen on a specific interface
	// - "0.0.0.0", "::" to listen on any interface
	// Default, when address config is left out or empty, is "localhost"
	port: 8080,
	basePath: "/",	// The URL path where MagicMirror² is hosted. If you are using a Reverse proxy
	// you must set the sub path here. basePath must end with a /
	ipWhitelist: ["127.0.0.1", "::ffff:127.0.0.1", "::1"],	// Set [] to allow all IP addresses
	// or add a specific IPv4 of 192.168.1.5 :
	// ["127.0.0.1", "::ffff:127.0.0.1", "::1", "::ffff:192.168.1.5"],
	// or IPv4 range of 192.168.3.0 --> 192.168.3.15 use CIDR format :
	// ["127.0.0.1", "::ffff:127.0.0.1", "::1", "::ffff:192.168.3.0/28"],

	useHttps: false,			// Support HTTPS or not, default "false" will use HTTP
	httpsPrivateKey: "",	// HTTPS private key path, only require when useHttps is true
	httpsCertificate: "",	// HTTPS Certificate path, only require when useHttps is true

	language: "en",
	locale: "en-US",
	logLevel: ["INFO", "LOG", "WARN", "ERROR"], // Add "DEBUG" for even more logging
	timeFormat: 24,
	units: "metric",

	modules: [
		{
			module: "MMM-SQLEngine",
			position: "bottom_left",
			config:
			{
				text: "MMM-SQLEngine",
				id: "MMSE1",
				consumerids: ["MMFC1"],
				showDOM: true,
				sqlParams: {
					sqlQuery: "SELECT 'Effective £ Value' as 'subject',a.object || ' ' || b.object as 'object',DATETIME(a.timestamp, 'unixepoch') as 'timestamp',a.value*b.value as 'value' FROM data a,data b where a.subject = 'ShareClose' and b.subject = 'GBExchange' ",
					//sqlQuery: "SELECT * FROM data ", 
				},
			},
		},
		{
			//example json 2 get closing share price from yahoo finance, note the dot naotion used in the itemfields to indicate the root, and then within that object, the fields to use
			//.0 indicated take first entry in a json array

			module: "MMM-Provider-JSON2",
			position: "top_left",
			config:
			{
				text: "MMM-Provider-JSON2",
				consumerids: ["MMSE1"],
				id: "MMJP21",
				showDOM: true,
				datarefreshinterval:1000*60*60*24,
				payloadType: "NDTF",
				jsonsource: [
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
					},
					{
						url: "https://apilayer.net/api/live?access_key=229c1fdd8169e191b50d2699a9801807&currencies=GBP&source=USD&format=1", //free currency exchange service
						itemfields: [
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
					}
				],
			},
		},
		
	]
};

/*************** DO NOT EDIT THE LINE BELOW ***************/
if (typeof module !== "undefined") { module.exports = config; }
