var Measured = require('measured'),
    metrics = Measured.createCollection();

metrics.gauge('RAM', function () {
    return process.memoryUsage().rss;
});

metrics.gauge('upTime', function () {
    return process.uptime();
});

module.exports = metrics;
