var mongodb = require('mongodb');
var fs = require('fs');
var async = require('async');
var MongoClient = mongodb.MongoClient;
var ObjectId = mongodb.ObjectId;
var url = 'mongodb://localhost:27017/twitchdata';

MongoClient.connect(url, function (err, db) {
  if (err) {
    console.log('Unable to connect to the mongoDB server. Error:', err);
  } else {
    console.log('Connection established to', url);

    var startDate = new Date('08/10/2015 18:34');
    var endDate = new Date('08/10/2015 23:34');
    var objIdMin = ObjectId(Math.floor((startDate)/1000).toString(16) + "0000000000000000");
    var objIdMax = ObjectId(Math.floor((endDate)/1000).toString(16) + "0000000000000000");

    var data = {
      channels: [],
      games: [],
      collectionruns: [],
      generalstats: []
    };
    var actions = [];

    // export channel data
    var channelsCollection = db.collection('channels');
    actions.push(function (cb) {
      channelsCollection.aggregate([
        {$unwind: '$stats'},
        {$match: {name: 'LIRIK', 'stats._id': {$gt: objIdMin, $lt: objIdMax}}},
        { "$group": {
          "_id": "$_id",
          "name": {$first: "$name"},
          "stats": {
            "$push":"$stats"
          }
        }}
      ]).toArray(function (err, result) {
        data.channels = result;
        cb();
      });
    });

    // export game data
    var gamesCollection = db.collection('games');
    actions.push(function (cb) {
      gamesCollection.aggregate([
        {$unwind: '$stats'},
        {$match: {name: 'League of Legends', 'stats._id': {$gt: objIdMin, $lt: objIdMax}}},
        { "$group": {
          "_id": "$_id",
          "name": {$first: "$name"},
          "stats": {
            "$push":"$stats"
          }
        }}
      ]).toArray(function (err, result) {
        data.games = result;
        cb();
      });
    });

    // export generalstats data
    var generalStatsCollection = db.collection('generalstats');
    actions.push(function (cb) {
      generalStatsCollection.find({'_id': {$gt: objIdMin, $lt: objIdMax}}).toArray(function (err, result) {
        console.log(err);
        data.generalstats = result;
        cb();
      });
    });

    // export collectionRun data
    var collectionRunsCollection = db.collection('collectionruns');
    actions.push(function (cb) {
      collectionRunsCollection.find({'_id': {$gt: objIdMin, $lt: objIdMax}}).toArray(function (err, result) {
        data.collectionruns = result;
        cb();
      });
    });

    async.parallel(actions, function () {
      var outputFilename = './data.json';
      fs.writeFile(outputFilename, JSON.stringify(data, null, 4), function(err) {
        if(err) {
          console.log(err);
        } else {
          console.log("JSON saved to " + outputFilename);
        }
      });
    })
  }
});
