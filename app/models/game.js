var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var StatsSchema = require('./stats').schema;

var GameSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    dateCreated: {
      type: Date
    },
    dateModified: {
      type: Date
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
