var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var StatsSchema = new Schema({
  viewers: {
      type: Number
  },
  channels: {
      type: Number
  },
  dateCreated: {
    type: Date
  }
});

StatsSchema.pre('save', function(next){
  if (!this.dateCreated) {
    this.dateCreated = new Date();
  }
  next();
});

module.exports = {
  model: mongoose.model('Stats', StatsSchema),
  schema: StatsSchema
};
