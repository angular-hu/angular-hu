(function(angular) {

  angular.module('httpu.retry', [])
  .factory('huRetryInterceptorFactory', huRetryInterceptorFactory);

  huRetryInterceptorFactory.$inject = ['$injector', '$q'];
  function huRetryInterceptorFactory($injector, $q) {

    return function(config) {

      var configuration = {
        /**
         * Callback function called when a retry is about to be performed
         * than can cancel the retry
         * Useful when you don't want to retry a request based on some
         * rejection parameters
         *
         * Must return a promise resolving to a boolean, allowing you
         * to perform an async operation before retrying, or a boolean
         * which means the desire of retrying
         *
         * It's called with the interceptors rejection
         * https://docs.angularjs.org/api/ng/service/$http
         *
         * @returns {$q.defer().promise|Boolean}
         *  Resolves with the desire of retrying (as a boolean)
         *  Rejects when the request should not be retried
         */
        shouldRetry: function retryAlways() {
          return true;
        },
        /**
         * The field to be looked in the config to determine
         * how many retries are remaining. Defaults to 'retries'
         *
         * $httpProvider.interceptors.push(['huRetryInterceptorFactory', function(huRetryInterceptorFactory) {
         *    return huRetryInterceptorFactory({
         *      retryField: 'myretries'
         *    });
         * }]);
         *
         * $http.get({
         *   myretries: 10
         * })
         * @type {String}
         */
        retryField: 'retries'
      };

      angular.extend(configuration, config || {});

      return {
        responseError: function onResponseError(rejection) {
          //should we retry?
          var remaining = rejection.config[configuration.retryField];
          if (remaining) {
            return $q.when(configuration.shouldRetry(rejection)).then(
              function(retry) {
                if (retry) {
                  rejection.config[configuration.retryField] = --remaining;
                  //Get here the Service cause circular dependency
                  var $http = $http || $injector.get('$http');
                  return $http(rejection.config);
                }
                return $q.reject(rejection);
              },
              function() {
                return $q.reject(rejection);
              }
            );
          }

          return $q.reject(rejection);
        }
      };
    };
  }
})(window.angular);
