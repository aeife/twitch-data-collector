var request = require('request');
var async = require('async');
var logger = require('log4js').getLogger();

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
    logger.debug('requesting game data from twitch');

    request.get({url: 'https://api.twitch.tv/kraken/games/top?limit=1', json: true}, function (err, res, data) {
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
        callback(null, twitchData);
      });
    });
  }
};
