var logger = require('log4js').getLogger();

module.exports = {
  validateGameData: function (data) {
      data.forEach(function (entry) {
        if (!entry || !entry.game) {
          logger.error('gameData invalid');
          logger.error(entry);
          return false;
        }
      });

      return true;
  },
  validateTotalStatsData: function (data) {
    return data && data.channels && data.viewers;
  }
};
