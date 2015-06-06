var express = require('express');
var app = express();
var request = require('request');
var _ = require('lodash');
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

var requestGames = function (nextUrl) {
  dataCollectingInProgress = true;

  if (!nextUrl) {
    nextUrl = 'https://api.twitch.tv/kraken/games/top?limit=100';
  }

  console.log('requesting: ' + nextUrl);
  request.get({url: nextUrl, json: true}, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      body.top.forEach(function (entry) {
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

            //console.log('game updated');
          });
        });
      });

      if (body.top.length) {
        requestGames(body._links.next);
      } else {
        console.log('finished collecting data');
        dataCollectingInProgress = false;
      }
    }
  });
};



setInterval(function () {
  if (!dataCollectingInProgress) {
    requestGames();
  }
}, 1000 * 60 * 5);
requestGames();
