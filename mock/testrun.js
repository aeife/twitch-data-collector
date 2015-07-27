var async = require('async');
var CollectionRun = require('../app/models/collectionRun').model;
var mongoose = require('mongoose');
var dbConnection = mongoose.connect('mongodb://localhost:27017/twitchdata', {
  server: { socketOptions: { keepAlive: 1}}
});

var log4js = require('log4js');
log4js.configure({
  appenders: [
    { type: 'console' },
    { type: 'file', filename: 'logs/collector.log'}
  ]
});
var logger = log4js.getLogger();
logger.setLevel('INFO');

process.on('uncaughtException', function(err) {
    // log error then exit
    logger.fatal(err);
    process.exit(1);
});

var dataGatherer = require('../app/dataGatherer');
var dataUpdater = require('../app/dataUpdater');

var collectData = function (date) {
  var dataGatherTasks = [function (cb) {
    dataGatherer.gatherGamesData(cb);
  }, function (cb) {
    dataGatherer.gatherGeneralStats(cb);
  }, function (cb) {
    dataGatherer.gatherChannelsData(cb);
  }];

  async.parallel(dataGatherTasks, function (err, result) {
      new CollectionRun({date: date}).save(function (err, currentCollectionRun) {
        var updateTasks = [function (cb) {
          dataUpdater.updateGameData(result[0], currentCollectionRun, cb);
        }, function (cb) {
          dataUpdater.updateCurrentGameData(result[0], currentCollectionRun, cb);
        }, function (cb) {
          dataUpdater.updateGeneralStatsData(result[1], currentCollectionRun, cb);
        }, function (cb) {
          dataUpdater.updateChannelData(result[2], currentCollectionRun, cb);
        }, function (cb) {
          dataUpdater.updateCurrentChannelData(result[2], currentCollectionRun, cb);
        }];

        async.parallel(updateTasks, function (err, result) {
          testRun();
        });
      });
  });
};

var startDate = new Date('01/01/2014 18:34');
var endDate = new Date('07/26/2015 18:34');
var date = new Date(startDate);
var mockData = require('./mockData.js');
mockData.initMockData(2);

var testRun = function () {
  if (endDate > date) {
    var oldDate = new Date(date);

    date = new Date(date.setHours(date.getHours()+1));
    if (date.getTime() === oldDate.getTime()) {
      date = new Date(date.setHours(date.getHours()+2));
    }
    logger.info(date);
    mockData.mockWithRandomData(date, {months: [2, 3, 8]});
    collectData(date);
  }
};
testRun();
