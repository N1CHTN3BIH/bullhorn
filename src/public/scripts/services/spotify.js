var request = require('request');
var qs = require('querystring');

angular.module('bullhorn')
  .service('Spotify', function($q) {

    var initialized = $q.defer();

    var startPort = 4370;
    var endPort = 4379;

    var charset = 'abcdefghijklmnopqrstuvwxyz1234567890';

    var generateRandomString = function(length) {
      var result = '';

      for (var i = length; i > 0; --i) {
        result += charset[Math.round(Math.random() * (charset.length - 1))];
      }

      return result;
    };

    var buildLocalUrl = function(port) {
      return 'https://' + svc.subDomain + '.spotilocal.com:' + port;
    };

    // Service
    var svc = {};

    svc.play = function(id) {
      initialized.promise.then(function() {
        svc.get('/remote/play.json', {
          'uri': id
        });
      });
    };

    svc.pause = function(pause) {
      initialized.promise.then(function() {
        svc.get('/remote/pause.json', {
          'pause': angular.isDefined(pause) ? pause : true
        });
      });
    };

    svc.determineLocalUrl = function() {
      var deferred = $q.defer();

      for (var port = startPort; port <= endPort; port++) {

        request(buildLocalUrl(port) + '/remote/status.json', function(error, response, body) {
          if (response && response.statusCode === 200) {
              deferred.resolve(response.request.port);
          }
        });
      }

      return deferred.promise;
    };

    svc.getOAuthToken = function() {
      var deferred = $q.defer();

      request('http://open.spotify.com/token', function(error, response, body) {
        var obj = JSON.parse(body);
        deferred.resolve(obj.t);
      });

      return deferred.promise;
    };

    svc.getCsrfToken = function() {
      var deferred = $q.defer();

      var path = '/simplecsrf/token.json?ref=&cors=';

      var options = {
        url: svc.localUrl + path,
        headers: {
          'Origin': 'https://open.spotify.com'
        }
      };

      request(options, function(error, response, body) {
        var obj = JSON.parse(body);
        deferred.resolve(obj.token);
      });

      return deferred.promise;
    };

    svc.get = function(path, params) {
      var deferred = $q.defer();

      if (/^\//.test(path)) {
        path = svc.localUrl + path;
      }

      var parameters = {
        'oauth': svc.oAuthToken,
        'csrf': svc.csrfToken,
        'ref': '',
        'cors': ''
      }

      if (angular.isDefined(params)) {
        angular.forEach(params, function(value, key) {
          parameters[key] = value;
        });
      }

      path += '?' + qs.stringify(parameters);

      request(path, function(error, response, body) {
        deferred.resolve();
      })

      return deferred.promise;
    };

    svc.initialize = function() {
      svc.subDomain = generateRandomString(5);

      svc.determineLocalUrl().then(function(port) {
        svc.localUrl = buildLocalUrl(port);

        $q.all([
          svc.getOAuthToken(),
          svc.getCsrfToken()
        ]).then(function(data) {

          svc.oAuthToken = data[0];
          svc.csrfToken = data[1];

          initialized.resolve();
        });
      });

      return initialized.promise;
    };

    svc.initialize();

    return svc;
  });