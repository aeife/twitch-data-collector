var request = require('request');
var async = require('async');
var logger = require('log4js').getLogger();

var _gatherFullData = function (name, url, dataParam, callback) {
  logger.debug('requesting %s data from twitch', name);

  request.get({url: url + '?limit=1', json: true}, function (err, res, data) {
    if (err) {
      logger.error('error while requesting games from twitch');
      logger.error(err);
      callback(err);
      return;
    }

    var limit = 100;
    var total = data._total + limit;

    var twitchRequests = [];
    for (var i = 0; i <= total; i = i+limit) {
      (function (offset) {
        twitchRequests.push(function (cb) {
          logger.debug('requesting %s?limit=%s&offset=%s', url, limit, offset);
          request.get({url: url, qs: {limit: limit, offset: offset}, json: true}, cb);
        });
      })(i);
    }

    async.parallelLimit(twitchRequests, 10, function (err, results) {
      var twitchData = results.reduce(function (combinedData, result) {
        return combinedData.concat(result[1][dataParam]);
      }, []);
      logger.debug('fetched %s %s from twitch api', twitchData.length, name);
      callback(null, twitchData);
    });
  });
};

module.exports = {
  gatherGeneralStats: function (callback) {
    logger.debug('requesting streams summary data from twitch');

    request.get({url: 'https://api.twitch.tv/kraken/streams/summary', json: true}, function (err, res, data) {
      if (err) {
        logger.error('error while requesting streams summary from twitch');
        logger.error(err);
        callback(err);
        return;
      }

      callback(null, data);
    });
  },
  gatherGamesData: function (callback) {
    _gatherFullData('game', 'https://api.twitch.tv/kraken/games/top', 'top', callback);
  }
};
