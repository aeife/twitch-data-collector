var fs = require('fs');
var path = require('path');
var express = require('express');
var router = express.Router();

module.exports = function (app) {
  var metrics = require('../metrics');
  router.route('/version')
    .get(function(req, res) {
        var config = require('../../package.json');
        res.send({applicationName: config.name, version: config.version});
    });
  router.route('/metrics').get(function(req, res) {
    res.send(metrics.toJSON());
  });

  function readStatusFile(callback) {
      fs.readFile(path.join(app.config.baseDir, 'config', 'version.txt'), 'utf8', callback);
  }

  return router;
};
