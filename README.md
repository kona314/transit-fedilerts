# Transit Fedilerts
This project distributes transit alerts via ActivityPub, mainly sourcing from GTFS-realtime Service Alerts feeds. It's primarily built on top of the [`activitypub-express`](https://github.com/immers-space/activitypub-express) library.

Currently, Transit Fedilerts is in beta. There may be bugs and features are limited. I welcome issues and pull requests! 

The "official" instance lives at [transit.alerts.social](https://transit.alerts.social)


# Usage 
- Clone the `transit-fedilerts` repo and install depdencies
- Define the agencies/services/feeds to include in `services.json`
  - The structure of this file is documented in the JSON schema format at `services.schema.json` (example below)
  - While the system looks for `services.json` by default, you can define a custom path with the environment variable `SERVICES_JSON`
- Compile TypeScript and run

## HTTPS/SSL
Transit Fedilerts starts up as an HTTP server, but ActivityPub requires HTTPS. A reverse proxy, such as nginx, is recommended to provide SSL support. Setting `DOMAIN` to `localhost` will introduce problems; for local development, consider [ngrok](https://ngrok.com) or other options that provide temporary domain names with SSL. 


## Environment Variables 
Transit Fedilerts uses `dotenv` for environment variables.
| Name | Required? | Description |
|------|-----------|-------------|
| `DOMAIN` | X | Domain name for the server |
| `MONGO_DB_NAME` | | The name of the MongoDB db to use. Defaults to `transitFedilerts` |
| `MONGO_URI` | | The connection URI for the Mongo instance. Defaults to `mongodb://localhost:27017` |
| `NO_FETCH_ALERTS` | | When present, the alert fetchers won't run. Useful for testing other components |
| `PORT` | | Port to run the server on. Defaults to `8080` |
| `SERVICES_JSON` | | Custom path to a services configuration file. Defaults to `services.json` |


## Example `services.json`
The config file is intended to be flexible and handle multiple use cases. A service is defined as a single transit entity and translates into an account users can follow, and a feed as the alerts feed itself. This separation will allow for complex use cases, such as agencies whose alerts might be in multiple feeds or feeds which may contain alerts from multiple agencies.

Here's a simple implementation for a single agency with a single feed:
```
{
    "services": [
        {
            "identifier": "commtrans",
            "name": "Community Transit",
            "iconUrl": "/commtrans.jpg"
        }
    ],
    "feeds": [
        {
            "url": "https://s3.amazonaws.com/commtrans-realtime-prod/alerts.pb",
            "relatesTo": ["commtrans"]
        }
    ]
}
```
Included in CT's feed are alerts for several Sound Transit routes. Perhaps we want to create a separate Sound Transit feed that includes just those routes: 
```
{
    "services": [
        {
            "identifier": "commtrans",
            "name": "Community Transit",
            "iconUrl": "/commtrans1.jpg"
        },
        {
            "identifier": "soundtransit",
            "name": "Sound Transit (CT)",
            "iconUrl": "/soundtransit-ct1.jpg"
        }
    ],
    "feeds": [
        {
            "url": "https://s3.amazonaws.com/commtrans-realtime-prod/alerts.pb",
            "relatesTo": [
                "commtrans",
                {
                    "identifier": "soundtransit",
                    "criteria": [
                        {
                            "routeId": {
                                "test": "^5\\d\\d$"
                            }
                        }
                    ]
                }
            ]
        }
    ]
}
```
This will keep all CT-operated service in `commtrans` and also push anything on an ST route to `soundtransit`. We could also add feeds for King County Metro and Pierce Transit (the other operators of ST Express buses) and push those to `soundtransit` based on similar criteria, optionally with additional services for each of them.


## Non-GTFS-realtime Alert Feeds
The goal of this project is primarily to support GTFS-realtime Service Alerts, but some non-standard formats are supported. Some implementation details and contribution guidelines:
- Each individual plugin exists as a subfolder in `./plugins` with the plugin ID as the folder name 
- The plugin ID must be defined as literals in `services.schema.json` and `./models/config.ts`
- The plugin case must be handled in `./alerts/fetchFeed.ts`, which returns an array of every found service alert
- The subfolder should include an `index.ts` file with the parse method as the default export


# Roadmap
The following features are not supported but are on my radar for the future—pull requests that start on these are encouraged. They are in no order.
- Web interface for prior alerts
  - Currently only show a (very basic) list of services
- Create actors for individual routes
  - This one's a big lift: Have to ingest and monitor the GTFS-static feed, map route IDs to names, map stops to routes, etc., as well as send a whole lot of messages per alert.
- Improved Mastodon interopability
  - Implement profile metadata: Official agency URLs? Link to server hosting the instance? More might fit here
  - Implement certain API endpoints, like [account statuses](https://docs.joinmastodon.org/methods/accounts/#statuses) and the [public timeline](https://docs.joinmastodon.org/methods/timelines/#public)
- Improved reverse proxy support 
  - The `host` must be maintained when passed from the proxy