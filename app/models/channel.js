var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var StatsSchema = require('./stats').schema;

var ChannelSchema = new Schema({
    name: {
        type: String,
        index: true
    },
    displayName: {
        type: String,
        index: true
    },
    language: {
      type: String
    },
    views: {
      type: Number
    },
    logo: {
      type: String
    },
    created: {
      type: Date
    },
    twitchChannelId: {
      type: Number,
      required: true,
      unique: true,
      index: true
    },
    stats: [StatsSchema]
});

module.exports = {
  model: mongoose.model('Channel', ChannelSchema),
  schema: ChannelSchema
};
