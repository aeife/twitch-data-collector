var chance = require('chance').Chance();
var nock = require('nock');

var _generateBaseMockData = function (count) {
  var games = [];
  for (var i = 0; i < count; i++) {
      games.push({
        game: {
          name: chance.name(),
          _id: chance.integer({min: 10000, max: 99999}),
          giantbomb_id: chance.integer({min: 10000, max: 99999})
        }
      });
  }

  return games;
};

var _randomizeMockData = function (games, date, omit) {
  // randomize mock data
  games.forEach(function (game) {
    game.viewers = Math.floor(Math.abs(chance.normal({mean: 5000, dev: 1500})));
    game.channels = Math.floor(Math.abs(chance.normal({mean: 1000, dev: 500})));
  });

  var tempGames = games.slice();
  if (omit && omit.months && omit.months.indexOf(date.getUTCMonth()+1) > -1) {
    // remove first game from results
    tempGames.splice(0, 1);

    // change name of second game
    tempGames[1].game.name = 'other name';
  }

  return tempGames;
};

var _baseMockGames;
var _gamesCount = 2;

module.exports = {
  initMockData: function (count) {
    _gamesCount = count || _gamesCount;
    _baseMockGames = _generateBaseMockData(_gamesCount);
  },
  mockWithRandomData: function (date, omit) {
    var games = _randomizeMockData(_baseMockGames, date, omit);
    nock.cleanAll();
    nock('https://api.twitch.tv/kraken/')
    .persist()
      .get('/games/top')
        .query(true)
        .reply(200, {
          _total: 2,  // always handle everything in one request?
          top: games
        })
      .get('/streams/summary')
        .reply(200, {
          viewers: Math.floor(Math.abs(chance.normal({mean: 500000, dev: 100000}))),
          channels: Math.floor(Math.abs(chance.normal({mean: 15000, dev: 3000})))
        });
  }
};
