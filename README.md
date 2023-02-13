# Transit Fedilerts
This project distributes alerts from GTFS-realtime Service Alerts feeds via ActivityPub. It's primarily built on top of the [`activitypub-express`](https://github.com/immers-space/activitypub-express) library.

Currently, Transit Fedilerts is in alpha. There may be bugs and features are limited. I welcome issues and pull requests! 

The "official" instance lives at [transit.alerts.social](https://transit.alerts.social)


# Usage 
- Install `transit-fedilerts` and depdencies
- Define the agencies/services/feeds to include in `services.json`
  - The structure of this file is documented in the JSON schema format at `services.schema.json`
  - While the system looks for `services.json` by default, you can define a custom path with the environment variable `SERVICES_JSON`
- Compile TypeScript and run

## HTTPS/SSL
Transit Fedilerts starts up as an HTTP server when `NODE_ENV === 'production'`, but ActivityPub requires HTTPS. A reverse proxy, such as nginx, is required to handle SSL (see more below). In development, provide paths in the `SSL_CERT` and `SSL_KEY` environment variables.


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
| `SSL_CERT` | | Path to an SSL certificate, used in development mode |
| `SSL_KEY` | | Path to an SSL public key, used in development mode |


# Roadmap
The following features are not supported but are on my radar for the future—pull requests that start on these are encouraged. They are in no order.
- Web interface for discovery of accounts to follow and prior alerts
- Use single URL for multiple services
  - Current implementation will hit a feed URL every time it's defined, ideal solution is fetch once and distribute
  - Is tied to having a way to filter out alerts in a feed based on criteria, e.g. `alert.informed_entity.agency_id`
- Create accounts for individual routes
  - This one's a big lift: Have to ingest and monitor the GTFS-static feed, map route IDs to names, map stops to routes, etc., to say nothing of the actual ActivityPub elements from there
- Improved Mastodon interopability
  - Implement profile metadata: Official agency URLs, link to server hosting the instance, more might fit here
  - Implement certain API endpoints, like [account statuses](https://docs.joinmastodon.org/methods/accounts/#statuses) and the [public timeline](https://docs.joinmastodon.org/methods/timelines/#public)
- Improved reverse proxy support 
  - The `host` must be maintained when passed from the proxy