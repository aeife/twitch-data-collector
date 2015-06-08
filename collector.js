var express = require('express');
var app = express();
var request = require('request');
var _ = require('lodash');
var async = require('async');
var log4js = require('log4js');
var metrics = require('./app/metrics');
var Game = require('./app/models/game').model;
var Stats = require('./app/models/stats').model;

var collectionMeter = metrics.meter('dataCollection');
var collectionTimer = metrics.timer('dataCollectionTime');
var collectionTimerWatch;

log4js.configure({
  appenders: [
    { type: 'console' },
    { type: 'file', filename: 'logs/collector.log'}
  ]
});
var logger = log4js.getLogger();
logger.setLevel('INFO')

var router = express.Router();
router.get('/', function(req, res) {
    res.json({ message: 'working' });
});
var controls = require('./app/api/control.js')(app);
app.use('/controls', controls);

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/twitch', {
  server: { socketOptions: { keepAlive: 1}}
});

var args = process.argv.slice(2);
var port = args[0] || 3000;

var server = app.listen(port, function () {
  logger.info('Example app listening at http://%s:%s', server.address().address, server.address().port);
});

var updateGameData = function (data) {
  // update or create received twitch games in db
  data.forEach(function (entry) {
    Game.findOne({ name: entry.game.name }, function (err, dbEntry) {
      if (err) {
        logger.error('error while searching for game "%s" in database', game.name);
        logger.error(err);
      }

      var game;

      if (dbEntry) {
        logger.debug('game "%s" already in database', dbEntry.name);
        game = dbEntry;
      } else {
        logger.debug('new game: "%s"', entry.game.name);
        game = new Game({
          name: entry.game.name
        });
      }
      game.stats.push({
        viewers: entry.viewers,
        channels: entry.channels
      });

      game.save(function(err) {
        if (err) {
          logger.error('error while updating game "%s"', game.name);
          logger.error(err);
        }
      });
    });
  });

  // find games in db that were not received from twitch, add entry to them
  var twitchGameNames = data.map(function (dataEntry) {
    return dataEntry.game.name;
  });
  Game.where('name').nin(twitchGameNames).exec(function (err, dbEntries) {
    dbEntries.forEach(function (game) {
      logger.debug('adding zero value entry to game "%s"', game.name);
      game.stats.push({
        viewers: 0,
        channels: 0
      });

      game.save(function(err) {
        if (err) {
          logger.error('error while updating game %s', game.name);
          logger.error(err);
        }
      });
    });
    logger.info('finished data collection run');
    collectionTimerWatch.end();
  });
};

var collectTotalStats = function () {
  logger.debug('requesting streams summary data from twitch');

  request.get({url: 'https://api.twitch.tv/kraken/streams/summary', json: true}, function (err, res, data) {
    if (err) {
      logger.error('error while requesting streams summary from twitch');
      logger.error(err);
      return;
    }

    var totalStats = new Stats({
      viewers: data.viewers,
      channels: data.channels
    });
    logger.debug('adding total stats');
    totalStats.save(function(err) {
      if (err) {
        logger.error('error while saving total stats');
        logger.error(err);
      }
    });
  });
};

var collectGames = function () {
  logger.debug('requesting game data from twitch');

  request.get({url: 'https://api.twitch.tv/kraken/games/top?limit=1', json: true}, function (err, res, data) {
    if (err) {
      logger.error('error while requesting games from twitch');
      logger.error(err);
      return;
    }

    var limit = 100;
    var total = data._total + limit;

    var twitchRequests = [];
    for (var i = 0; i <= total; i = i+limit) {
      logger.debug('requesting https://api.twitch.tv/kraken/games/top?limit='+limit+'&offset='+i);
      (function (offset) {
        twitchRequests.push(function (cb) {
          request.get({url: 'https://api.twitch.tv/kraken/games/top', qs: {limit: limit, offset: offset}, json: true}, cb);
        });
      })(i);
    }

    async.parallel(twitchRequests, function (err, results) {
      var twitchData = results.reduce(function (combinedData, result) {
        return combinedData.concat(result[1].top);
      }, []);
      logger.debug('fetched ' + twitchData.length + ' games from twitch api');
      updateGameData(twitchData);
    });
  });
};

var collectData = function () {
  logger.info('starting data collection run');
  collectionMeter.mark();
  collectionTimerWatch = collectionTimer.start();

  collectGames();
  collectTotalStats();
};

setInterval(function () {
  collectData();
}, 1000 * 60 * 30);
collectData();
