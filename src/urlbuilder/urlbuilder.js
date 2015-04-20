(function(angular) {
  'use strict';

  angular.module('httpu.urlbuilder', [])
      .factory('huURLBuilderInterceptor', huURLBuilderInterceptor)
      .factory('huURLBuilderFactory', huURLBuilderFactory);

  huURLBuilderInterceptor.$inject = ['$injector', '$q'];
  function huURLBuilderInterceptor($injector, $q) {
    //the property to add to the config
    var KEY = '__huURLBuilder';

    return {
      request: requestInterceptor,
      response: responseInterceptor,
      responseError: responseErrorInterceptor
    };

    //////////////////////////

    function requestInterceptor(config) {
      if (!config.buildUrl) {
        return config;
      }

      //Get the serialization service or func
      var buildUrl = angular.isString(config.buildUrl) ?
          $injector.get(config.buildUrl) :
          config.buildUrl;

      //Save the original config for restoring later
      config[KEY] = {
        url: config.url,
        params: config.params
      };

      config.url = buildUrl(config.url, config.params);
      config.params = null;

      return config;
    }

    function responseInterceptor(response) {
      return restoreOriginal(response);
    }

    function responseErrorInterceptor(rejection) {
      return $q.reject(restoreOriginal(rejection));
    }

    /**
     * Restores params an url from the original config
     *
     * @private
     * @param {Object} res The response/rejection object
     * @returns {Object} The response/rejection object
     */
    function restoreOriginal(res) {
      if (!res || !res.config || !res.config[KEY]) {
        return res;
      }

      res.config.url = res.config[KEY].url;
      res.config.params = res.config[KEY].params;
      delete res.config[KEY];

      return res;
    }
  }

  huURLBuilderFactory.$inject = ['$window'];
  function huURLBuilderFactory($window) {
    return paramsSerializer;

    //////////////////////////////

    /**
     * From Angular
     * Please guys! export this!
     */
    function encodeUriQuery(val) {
      return $window.encodeURIComponent(val)
          .replace(/%40/gi, '@')
          .replace(/%3A/gi, ':')
          .replace(/%24/g, '$')
          .replace(/%2C/gi, ',')
          .replace(/%20/g, '+');
    }

    /**
     * Default serializer
     * Stringifies the parameters values, with any order
     *
     * @param {Object} params The parameters object
     * @param {Function} cb The callback(key, value) function to call when done
     *   serializing a parameter
     */
    function toStringEncode(params, cb) {
      angular.forEach(params, function iterator(value, key) {
        cb(key, '' + value);
      });
    }

    function paramsSerializer(serializer) {
      serializer = serializer || toStringEncode;

      return function buildUrl(url, params) {
        if (!params) {
          return url;
        }
        var parts = [];

        serializer(params, function addKeyValue(key, value) {
          parts.push(encodeUriQuery(key) + '=' + encodeUriQuery(value));
        });

        if (parts.length > 0) {
          url += ((url.indexOf('?') === -1) ? '?' : '&') + parts.join('&');
        }
        return url;
      };
    }
  }

})(window.angular);
