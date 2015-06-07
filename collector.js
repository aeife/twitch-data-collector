var express = require('express');
var app = express();
var request = require('request');
var _ = require('lodash');
var async = require('async');
var log4js = require('log4js');
var Game = require('./app/models/game').model;
var Stats = require('./app/models/stats').model;

log4js.configure({
  appenders: [
    { type: 'console' },
    { type: 'file', filename: 'logs/collector.log'}
  ]
});
var logger = log4js.getLogger();

app.get('/', function (req, res) {
  res.send('Hello World!');
});

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/twitch');

var server = app.listen(3000, function () {

  var host = server.address().address;
  var port = server.address().port;

  logger.info('Example app listening at http://%s:%s', host, port);
});

var updateGameData = function (data) {
  // update or create received twitch games in db
  data.forEach(function (entry) {
    Game.findOne({ name: entry.game.name }, function (err, dbEntry) {
      var game;

      if (dbEntry) {
        logger.info('game "%s" already in database', dbEntry.name);
        game = dbEntry;
      } else {
        logger.info('new game: "%s"', entry.game.name);
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
          logger.info('error while updating game "%s"', game.name);
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
      logger.info('adding zero value entry to game "%s"', game.name);
      game.stats.push({
        viewers: 0,
        channels: 0
      });

      game.save(function(err) {
        if (err) {
          logger.info('error while updating game %s', game.name);
        }
      });
    });
  });
};

var requestGames = function () {
  request.get({url: 'https://api.twitch.tv/kraken/games/top?limit=1', json: true}, function (error, response, data) {
    var limit = 100;
    var total = data._total + limit;

    var twitchRequests = [];
    for (var i = 0; i <= total; i = i+limit) {
      logger.info('requesting https://api.twitch.tv/kraken/games/top?limit='+limit+'&offset='+i);
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
      logger.info('fetched ' + twitchData.length + ' games from twitch api');
      updateGameData(twitchData);
    });
  });
};

setInterval(function () {
  requestGames();
}, 1000 * 60 * 5);
requestGames();