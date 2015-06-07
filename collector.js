var express = require('express');
var app = express();
var request = require('request');
var _ = require('lodash');
var async = require('async');
var Game = require('./app/models/game').model;
var Stats = require('./app/models/stats').model;
var dataCollectingInProgress = false;

app.get('/', function (req, res) {
  res.send('Hello World!');
});

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/twitch');

var server = app.listen(3000, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});

var updateGameData = function (data) {
  data.forEach(function (entry) {
    Game.findOne({ name: entry.game.name }, function (err, dbEntry) {
      var game;

      if (dbEntry) {
        console.log('game already in database');
        game = dbEntry;
      } else {
        console.log('new game');
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
          console.log('error while updating');
        }
      });
    });
  });
};

var requestGames = function () {
  dataCollectingInProgress = true;

  request.get({url: 'https://api.twitch.tv/kraken/games/top?limit=1', json: true}, function (error, response, data) {
    var limit = 100;
    var total = data._total + limit;

    var twitchRequests = [];
    for (var i = 0; i <= total; i = i+limit) {
      console.log('requesting https://api.twitch.tv/kraken/games/top?limit='+limit+'&offset='+i);
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
      console.log('fetched ' + twitchData.length + ' games from twitch api');
      updateGameData(twitchData);
    });
  });
};

setInterval(function () {
  if (!dataCollectingInProgress) {
    requestGames();
  }
}, 1000 * 60 * 5);
requestGames();
