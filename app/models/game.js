var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var StatsSchema = require('./stats').schema;

var GameSchema = new Schema({
    name: {
        type: String,
        unique: true,
        index: true
    },
    dateCreated: {
      type: Date
    },
    dateModified: {
      type: Date
    },
    twitchGameId: {
      type: Number,
      required: true,
      unique: true,
      index: true
    },
    giantbombId: {
      type: Number
    },
    viewers: {
        type: Number
    },
    channels: {
        type: Number
    },
    collectionRun: {
        type: Number,
        ref: 'CollectionRun'
    },
    stats: [StatsSchema]
});

GameSchema.pre('save', function(next){
  this.dateModified = new Date();
  if (!this.dateCreated) {
    this.dateCreated = new Date();
  }
  next();
});

module.exports = {
  model: mongoose.model('Game', GameSchema),
  schema: GameSchema
};
