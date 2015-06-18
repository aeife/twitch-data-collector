var express = require('express');
var app = express();
var request = require('request');
var _ = require('lodash');
var async = require('async');
var log4js = require('log4js');
var metrics = require('./app/metrics');
var autoIncrement = require('mongoose-auto-increment');
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
logger.setLevel('INFO');

var router = express.Router();
router.get('/', function(req, res) {
    res.json({ message: 'working' });
});
var controls = require('./app/api/control.js')(app);
app.use('/controls', controls);

var mongoose = require('mongoose');
var dbConnection = mongoose.connect('mongodb://localhost:27017/twitchdata', {
  server: { socketOptions: { keepAlive: 1}}
});
autoIncrement.initialize(dbConnection);

var args = process.argv.slice(2);
var port = args[0] || 3000;

var server = app.listen(port, function () {
  logger.info('Example app listening at http://%s:%s', server.address().address, server.address().port);
});

var Game = require('./app/models/game').model;
var Stats = require('./app/models/stats').model;
var CollectionRun = require('./app/models/collectionRun').model;
var currentCollectionRun;

var updateGameData = function (data) {
  // update or create received twitch games in db
  var gamesProcessed = [];
  var gameUpdates = [];
  data.forEach(function (entry) {
    // prevent duplicates: only process game once
    if (gamesProcessed.indexOf(entry.game.name) > -1) {
      return;
    }
    gamesProcessed.push(entry.game.name);
    gameUpdates.push(function (cb) {
      var statEntry = new Stats({
        viewers: entry.viewers,
        channels: entry.channels,
        collectionRun: currentCollectionRun._id
      });
      Game.update({twitchGameId: entry.game._id}, {$addToSet: {stats: statEntry}}, function (err, affected) {
        if (err) {
          logger.error('error while updating game "%s" in database', entry.game.name);
          logger.error(err);
        }

        if (!affected.n) {
          new Game({
            name: entry.game.name,
            twitchGameId: entry.game._id,
            stats: [statEntry]
          }).save(function (err) {
            if (err) {
              logger.error('error while creating new game "%s" in database', entry.game.name);
              logger.error(err);
            }
            logger.debug('added new game game "%s" to database', entry.game.name);
            cb();
          });
        } else {
          logger.debug('added stat entry to game "%s"', entry.game.name);
          cb();
        }
      });
    });
  });

  async.parallel(gameUpdates, function () {
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
      channels: data.channels,
      collectionRun: currentCollectionRun._id
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

  new CollectionRun().save(function (err, entry) {
    currentCollectionRun = entry;
    if (err) {
      logger.error('error while saving new collction run', game.name);
      logger.error(err);
    }

    collectGames();
    collectTotalStats();
  });
};

setInterval(function () {
  collectData();
}, 1000 * 60 * 30);
collectData();
