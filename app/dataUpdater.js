var async = require('async');
var logger = require('log4js').getLogger();
var Game = require('./models/game').model;
var Channel = require('./models/channel').model;
var Stats = require('./models/stats').model;
var CurrentGame = require('./models/currentGame').model;
var CurrentChannel = require('./models/currentChannel').model;
var CollectionRun = require('./models/collectionRun').model;
var mongoose = require('mongoose');

module.exports = {
  updateCurrentGameData: function (data, collectionRun, callback) {
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

        var currentGameEntry = new CurrentGame({
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
        var currentGameObject =  currentGameEntry.toObject();
        delete currentGameObject._id;

        CurrentGame.update({twitchGameId: entry.game._id}, currentGameObject, {upsert: true}, function (err, affected) {
          if (err) {
            logger.error('error while creating new current game "%s" in database', entry.game.name);
            logger.error(err);
          }
          logger.debug('added current game entry for game "%s" to database', entry.game.name);
          cb();
        });
      });
    });

    // update all other entries
    gameUpdates.push(function (cb) {
      CurrentGame.update({name: { $nin: gamesProcessed}}, {$set: {channels: 0, viewers: 0, ratio: 0}}, {multi: true}, function (err, res) {
        if (err) {
          logger.error('error while updating other current games');
          logger.error(err);
        }
        logger.debug('successfully updated other current games');
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
        Game.update({twitchGameId: entry.game._id}, {name: entry.game.name, $addToSet: {stats: statEntry}}, function (err, affected) {
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
  updateChannelData: function (data, collectionRun, callback) {
    // update or create received twitch games in db
    var channelsProcessed = [];
    var channelUpdates = [];
    data.forEach(function (entry) {
      // prevent duplicates: only process channel once
      if (!entry.channel || !entry.channel._id || channelsProcessed.indexOf(entry.channel._id) > -1 || !entry.channel.views || entry.channel.views < 1000000) {
        return;
      }

      channelsProcessed.push(entry.channel._id);
      channelUpdates.push(function (cb) {
        var statEntry = new Stats({
          viewers: entry.viewers,
          followers: entry.channel.followers,
          logo: entry.channel.logo,
          collectionRun: {
            run: collectionRun._id,
            date: collectionRun.date
          }
        });

        Channel.update({twitchChannelId: entry.channel._id}, {
          name: entry.channel.display_name,
          views: entry.channel.views,
          logo: entry.channel.logo,
          $addToSet: {stats: statEntry}
        }, function (err, affected) {
          if (err) {
            logger.error('error while updating channel "%s" in database', entry.channel.display_name);
            logger.error(err);
            callback(err);
            return;
          }

          if (!affected.n) {
            new Channel({
              name: entry.channel.display_name,
              twitchChannelId: entry.channel._id,
              language: entry.channel.language,
              views: entry.channel.views,
              stats: [statEntry]
            }).save(function (err) {
              if (err) {
                logger.error('error while creating new channel "%s" in database', entry.channel.display_name);
                logger.error(err);
              }
              logger.debug('added new channel "%s" to database', entry.channel.display_name);
              cb();
            });
          } else {
            logger.debug('added stat entry to channel "%s"', entry.channel.display_name);
            cb();
          }
        });
      });
    });

    async.parallel(channelUpdates, function () {
      callback(null);
    });
  },
  updateCurrentChannelData: function (data, collectionRun, callback) {
    var channelsProcessed = [];
    var channelUpdates = [];

    data.forEach(function (entry) {
      if (!entry.channel || !entry.channel._id || channelsProcessed.indexOf(entry.channel._id) > -1 || !entry.channel.views || entry.channel.views < 1000000) {
        return;
      }
      channelsProcessed.push(entry.channel._id);

      channelUpdates.push(function (cb) {
        var currentChannelEntry = new CurrentChannel({
          name: entry.channel.display_name,
          twitchChannelId: entry.channel._id,
          viewers: entry.viewers,
          views: entry.channel.views,
          followers: entry.channel.followers,
          logo: entry.channel.logo,
          collectionRun: {
            run: collectionRun._id,
            date: collectionRun.date
          }
        });
        var currentChannelObject =  currentChannelEntry.toObject();
        delete currentChannelObject._id;

        CurrentChannel.update({twitchChannelId: entry.channel._id}, currentChannelObject, {upsert: true}, function (err, affected) {
          if (err) {
            logger.error('error while creating new current channel "%s" in database', entry.channel.display_name);
            logger.error(err);
          }
          logger.debug('added current channel entry for channel "%s" to database', entry.channel.display_name);
          cb();
        });
      });
    });

    // update all other entries
    channelUpdates.push(function (cb) {
      CurrentChannel.update({twitchChannelId: { $nin: channelsProcessed}}, {$set: {viewers: 0}}, {multi: true}, function (err, res) {
        if (err) {
          logger.error('error while updating other current channels');
          logger.error(err);
        }
        logger.debug('successfully updated other current channels');
        cb();
      });
    });

    async.parallel(channelUpdates, function () {
      callback(null);
    });
  },
  updateGeneralStatsData: function (data, collectionRun, callback) {
    var generalStats = new Stats({
      viewers: data.viewers,
      channels: data.channels,
      collectionRun: {
        run: collectionRun._id,
        date: collectionRun.date
      }
    });
    logger.debug('adding general stats');
    generalStats.save(function(err) {
      if (err) {
        logger.error('error while saving general stats');
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
