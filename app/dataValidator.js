var logger = require('log4js').getLogger();

module.exports = {
  validateGameData: function (data) {
      var valid = true;

      if (!data.length) {
        logger.error('gameData invalid: empty');
        valid = false;
      }

      var missingData = data.some(function (entry) {
        return (!entry || !entry.game);
      });

      if (missingData) {
        logger.error('gameData invalid: does not contain needed data');
        valid = false;
      }

      return valid;
  },
  validateChannelData: function (data) {
      var valid = true;

      if (!data.length) {
        logger.error('channelData invalid: empty');
        valid = false;
      }

      var missingData = data.some(function (entry) {
        return (!entry || !entry.channel);
      });

      if (missingData) {
        logger.error('channelData invalid: does not contain needed data');
        valid = false;
      }

      return valid;
  },
  validateGeneralStatsData: function (data) {
    return data && data.channels && data.viewers;
  }
};
