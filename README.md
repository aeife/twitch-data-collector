# twitch-data-collector

Collector that gathers information from Twitch API for [TTV Stats](ttvstats.com). Based on Node.js and Express.

#### other twitchdata repositories
* [twitch-data-api](https://github.com/aeife/twitch-data-api)
* [twitch-data-client](https://github.com/aeife/twitch-data-client)

### Collector
Periodically fetches game and channel data from the Twitch API and saves them in a database (MongoDB). Provides a metrics API ressource to check performance and progress.

### Failure Strategies
The folder "scripts" includes some scripts to transfer data during a certain timeframe between collector instances.

### Development
Steps to run this project in a local dev environment

1. ```npm install```

  installs development dependencies

2. ```node collector.js```

  starts the Collector, collector will gather data right after start and then according to interval settings

This projects needs a running database (MongoDB).

#### Mock data
The folder "mock" includes scripts for adding random example data.
