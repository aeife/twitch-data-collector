var express = require('express');
var app = express();
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

process.on('uncaughtException', function(err) {
    // log error then exit
    logger.fatal(err);
    process.exit(1);
});

var dataGatherer = require('./app/dataGatherer');
var dataUpdater = require('./app/dataUpdater');
var dataValidator = require('./app/dataValidator');
var retryLimit = 3;
var retry = 0;


var collectData = function () {
  logger.info('starting data collection run');
  collectionMeter.mark();
  collectionTimerWatch = collectionTimer.start();

  var dataGatherTasks = [function (cb) {
    dataGatherer.gatherGamesData(cb);
  }, function (cb) {
    dataGatherer.gatherTotalStats(cb);
  }];

  async.parallel(dataGatherTasks, function (err, result) {
    if (!err && dataValidator.validateGameData(result[0]) && dataValidator.validateTotalStatsData(result[1])) {
      retry = 0;
      dataUpdater.addNewCollectionRun(function (err, currentCollectionRun) {
        var updateTasks = [function (cb) {
          dataUpdater.updateGameData(result[0], currentCollectionRun, cb);
        }, function (cb) {
          dataUpdater.updateLastRunData(result[0], currentCollectionRun, cb);
        }, function (cb) {
          dataUpdater.updateTotalStatsData(result[1], currentCollectionRun, cb);
        }];

        async.parallel(updateTasks, function (err, result) {
          if (err) {
            logger.error('error while updating data');
            logger.error(err);
            return;
          }

          logger.info('finished data collection run');
          collectionTimerWatch.end();
        });
      });
    } else {
      logger.error('error while gathering twitch data');
      if (retry < retryLimit) {
        logger.error('retry %s', ++retry);
        collectData();
      } else {
        logger.error('all retries failed');
        retry = 0;
      }
    }
  });
};

setInterval(function () {
  collectData();
}, 1000 * 60 * 100);
collectData();
