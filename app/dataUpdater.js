var async = require('async');
var logger = require('log4js').getLogger();
var Game = require('./models/game').model;
var Stats = require('./models/stats').model;
var CollectionRun = require('./models/collectionRun').model;
var mongoose = require('mongoose');
var LastRun = mongoose.model('Game', require('./models/game').schema, 'lastRun');

module.exports = {
  updateLastRunData: function (data, collectionRun, callback) {
    var gamesProcessed = [];
    var gameUpdates = [];

    data.forEach(function (entry) {
      if (gamesProcessed.indexOf(entry.game.name) > -1 || entry.game.name === '') {
        return;
      }
      gamesProcessed.push(entry.game.name);

      gameUpdates.push(function (cb) {
        var ratio = 0;
        if (entry.channels > 0 && entry.viewers > 0) {
          ratio = entry.viewers / entry.channels;
        }

        var lastRunEntry = new LastRun({
          name: entry.game.name,
          twitchGameId: entry.game._id,
          giantbombId: entry.game.giantbomb_id,
          viewers: entry.viewers,
          channels: entry.channels,
          ratio: ratio,
          collectionRun: {
            run: collectionRun._id,
            date: collectionRun.date
          }
        });
        var lastRunObject =  lastRunEntry.toObject();
        delete lastRunObject._id;

        // LastRun.findOneAndUpdate({twitchGameId: entry.game._id}, lastRunEntry, {upsert:true}, function(err, affected){
        LastRun.update({twitchGameId: entry.game._id}, lastRunObject, {upsert: true}, function (err, affected) {
          if (err) {
            logger.error('error while creating new game "%s" in database', entry.game.name);
            logger.error(err);
          }
          logger.debug('added last run entry for game "%s" to database', entry.game.name);
          cb();
        });
      });
    });

    // update all other entries
    gameUpdates.push(function (cb) {
      LastRun.update({name: { $nin: gamesProcessed}}, {$set: {channels: 0, viewers: 0, ratio: 0}}, {multi: true}, function (err, res) {
        if (err) {
          logger.error('error while updating other games from last run');
          logger.error(err);
        }
        logger.debug('successfully updated other games from last run');
        cb();
      });
    });

    async.parallel(gameUpdates, function () {
      callback(null);
    });
  },
  updateGameData: function (data, collectionRun, callback) {
    // update or create received twitch games in db
    var gamesProcessed = [];
    var gameUpdates = [];
    data.forEach(function (entry) {
      // prevent duplicates: only process game once
      if (gamesProcessed.indexOf(entry.game.name) > -1 || entry.game.name === '') {
        return;
      }
      gamesProcessed.push(entry.game.name);
      gameUpdates.push(function (cb) {
        var statEntry = new Stats({
          viewers: entry.viewers,
          channels: entry.channels,
          collectionRun: {
            run: collectionRun._id,
            date: collectionRun.date
          }
        });
        Game.update({twitchGameId: entry.game._id}, {$addToSet: {stats: statEntry}}, function (err, affected) {
          if (err) {
            logger.error('error while updating game "%s" in database', entry.game.name);
            logger.error(err);
            callback(err);
            return;
          }

          if (!affected.n) {
            new Game({
              name: entry.game.name,
              twitchGameId: entry.game._id,
              giantbombId: entry.game.giantbomb_id,
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
      callback(null);
    });
  },
  updateTotalStatsData: function (data, collectionRun, callback) {
    var totalStats = new Stats({
      viewers: data.viewers,
      channels: data.channels,
      collectionRun: {
        run: collectionRun._id,
        date: collectionRun.date
      }
    });
    logger.debug('adding total stats');
    totalStats.save(function(err) {
      if (err) {
        logger.error('error while saving total stats');
        logger.error(err);
        callback(err);
        return;
      }

      callback(null);
    });
  },
  addNewCollectionRun: function (callback) {
    new CollectionRun().save(function (err, entry) {
      if (err) {
        logger.error('error while saving new collection run', game.name);
        logger.error(err);
      }

      callback(err, entry);
    });
  }
};
