var mongodb = require('mongodb');
var fs = require('fs');
var MongoClient = mongodb.MongoClient;
var ObjectId = mongodb.ObjectId;
var url = 'mongodb://localhost:27017/twitchdata';

MongoClient.connect(url, function (err, db) {
  if (err) {
    console.log('Unable to connect to the mongoDB server. Error:', err);
  } else {

    var data = require('./data.json');

    // import channel stats
    var channelsCollection = db.collection('channels');
    data.channels.forEach(function (channel) {
      channel.stats.forEach(function (entry) {
        entry._id = ObjectId(entry._id);
        entry.collectionRun = {
          date: new Date(entry.collectionRun.date),
          run: ObjectId(entry.collectionRun.run)
        }
      });
      channelsCollection.update({_id: ObjectId(channel._id)}, {$addToSet: {stats: {$each: channel.stats }}}, function (err, result) {
        if (err) {
          console.log('import for channels failed');
          console.log(err);
        }
        console.log('successfully updated channels');
      })
    });

    // import game stats
    var gamesCollection = db.collection('games');
    data.games.forEach(function (game) {
      game.stats.forEach(function (entry) {
        entry._id = ObjectId(entry._id);
        entry.collectionRun = {
          date: new Date(entry.collectionRun.date),
          run: ObjectId(entry.collectionRun.run)
        }
      });
      gamesCollection.update({_id: ObjectId(game._id)}, {$addToSet: {stats: {$each: game.stats }}}, function (err, result) {
        if (err) {
          console.log('import for games failed');
          console.log(err);
        }
        console.log('successfully updated games');
      })
    });

    // import general stats
    var generalStatsCollection = db.collection('generalstats');
    data.generalstats.forEach(function (entry) {
      entry._id = ObjectId(entry._id);
      entry.collectionRun = {
        date: new Date(entry.collectionRun.date),
        run: ObjectId(entry.collectionRun.run)
      };
    });
    generalStatsCollection.insert(data.generalstats, function (err) {
      if (err) {
        console.log('import for generalstats failed');
        console.log(err);
      }
      console.log('successfully updated generalstats');
    })

    // import collectionruns
    var collectionRunsCollection = db.collection('collectionruns');
    data.collectionruns.forEach(function (collectionRun) {
      collectionRun._id = ObjectId(collectionRun._id);
      collectionRun.date = new Date(collectionRun.date);
    });
    collectionRunsCollection.insert(data.collectionruns, function (err) {
      if (err) {
        console.log('import for collectionruns failed');
        console.log(err);
      }
      console.log('successfully updated collectionruns');
    });
  }
});
