(function(angular) {

  angular.module('httpu.oauth1', [])
      .factory('huOAuth1InterceptorFactory', huOAuth1InterceptorFactory);

  huOAuth1InterceptorFactory.$inject = ['$injector', '$q', '$window'];
  function huOAuth1InterceptorFactory($injector, $q, $window) {
    /*eslint camelcase:0*/
    var CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz',
        DEFAULT_SIGNATURE_METHOD = 'HMAC-SHA1',
        DEFAULT_NONCE_LENGTH = 11,
        ERROR_CODES = {
          MissingKeySecret: 'MissingKeySecret'
        };

    return function(configu) {
      var configuration = {
        oauth_signature_method: DEFAULT_SIGNATURE_METHOD,
        createError: defaultCreateError,
        getTimestamp: defaultGetTimestamp,
        serializer: defaultSerializer,
        nonce: defaultNonce
      };

      angular.extend(configuration, configu || {});

      return {
        request: requestInterceptor
      };

      ////////////////////////////////////

      function requestInterceptor(config) {
        if (!config.oauth1) {
          return config;
        }

        var getTimestamp = getFn(configuration.getTimestamp),
            nonce = getFn(configuration.nonce);

        if (config.oauth1.consumerKey == null || config.oauth1.consumerSecret == null) {
          //Creating errors on interceptors our own way is dangerous, cause another
          //interceptor with requestError/responseError can have the same error mngmt
          var error = getFn(configuration.createError)(config, new Error(ERROR_CODES.MissingKeySecret));
          return $q.reject(error);
        }

        return $q.when()
            //allow to catch errors thrown errors from non-promise getTimestamp
            .then(getTimestamp)
            .then(function(timestamp) {
              config.params = config.params || {};
              //We dont want to use a preexisting signature, cause it
              //will be used to sign the request and then will be overwritten
              //causing an Invalid Signature
              delete config.params.oauth_signature;

              angular.extend(config.params, {
                oauth_consumer_key: config.oauth1.consumerKey.toString(),
                oauth_nonce: nonce(),
                oauth_timestamp: timestamp,
                oauth_signature_method: configuration.oauth_signature_method,
                oauth_version: '1.0'
              });

              //Serialize our parameters
              var parameters = {};
              configuration.serializer(config.params, function(key, value) {
                parameters[key] = value;
              });

              config.params.oauth_signature = $window.oauthSignature.generate(
                  config.method,
                  config.url,
                  parameters,
                  config.oauth1.consumerSecret.toString(),
                  '' + (config.oauth1.tokenSecret || ''),
                  {
                    //Dont encode signature, cause angular $http does for us
                    encodeSignature: false
                  }
              );

              return config;
            })
            .catch(function(err) {
              var signError = getFn(configuration.createError)(config, err);
              return $q.reject(signError);
            });
      }
    };

    function getFn(ref) {
      return angular.isString(ref) ? $injector.get(ref) : ref;
    }

    function defaultNonce() {
      var result = '';

      for (var i = 0; i < DEFAULT_NONCE_LENGTH; ++i) {
        var rNum = $window.Math.floor($window.Math.random() * CHARS.length);
        result += CHARS.substring(rNum, rNum + 1);
      }
      return result;
    }

    function defaultCreateError(config, err) {
      config.error = err;
      return config;
    }

    function defaultGetTimestamp() {
      var t = (new Date()).getTime();
      return $window.Math.floor(t / 1000);
    }

    function defaultSerializer(params, cb) {
      angular.forEach(params, function(value, key) {
        cb(key, '' + value);
      });
    }
  }

})(window.angular);
