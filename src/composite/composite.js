(function(angular) {
  'use strict';

  angular.module('httpu.composite', [])
    .factory('huComposite', huComposite);

  /**
   * Makes a composite pattern for interceptors, allowing to use a flag
   * to apply a set of interceptors for a determinate request
   *
   * @param {Object} $q
   * @param {Object} $injector
   * @returns {Function} The factory function
   */
  function huComposite($q, $injector) {
    return function huCompositeFactory(interceptorFactories, options) {
      var toBackend = [],
        fromBackend = [],
        configuration = angular.extend({
          flag: null,
          backend: null
        }, options);

      var interceptor = {
        request: requestInterceptor,
        requestError: requestErrorInterceptor,
        response: responseInterceptor,
        responseError: responseErrorInterceptor
      };

      initChains();

      return interceptor;

      /////////////////////////////////

      function requestInterceptor(config) {
        if (appliesChain(config)) {
          return applyInterceptorChain($q.when(config), toBackend);
        }
        return config;
      }

      function requestErrorInterceptor(rejection) {
        if (appliesChain(rejection)) {
          return applyInterceptorChain($q.reject(rejection), toBackend);
        }
        return $q.reject(rejection);
      }

      function responseInterceptor(response) {
        if (response && appliesChain(response.config)) {
          return applyInterceptorChain($q.when(response), fromBackend);
        }
        return response;
      }

      function responseErrorInterceptor(rejection) {
        if (rejection && appliesChain(rejection.config)) {
          return applyInterceptorChain($q.reject(rejection), fromBackend);
        }
        return $q.reject(rejection);
      }

      /**
       * Initializes the toBackend and fromBackend Chains with the provided
       * interceptor factories
       */
      function initChains() {
        angular.forEach(interceptorFactories, function iterator(interceptorFactory) {
          //support for 'string' or annotated factories
          var currentInterceptor = angular.isString(interceptorFactory) ?
            $injector.get(interceptorFactory) :
            $injector.invoke(interceptorFactory);

          if (currentInterceptor.request || currentInterceptor.requestError) {
            toBackend.push({
              resolve: currentInterceptor.request,
              reject: currentInterceptor.requestError
            });
          }
          if (currentInterceptor.response || currentInterceptor.responseError) {
            fromBackend.unshift({
              resolve: currentInterceptor.response,
              reject: currentInterceptor.responseError
            });
          }
        });
      }

      /**
       * Checks if a config flag is in the request
       * @param {Object} config
       * @returns {boolean}
       */
      function appliesChain(config) {
        return (!configuration.flag && !configuration.backend) ||
          (config && angular.isDefined(config[configuration.flag])) ||
          (config && configuration.backend && configuration.backend.test(config.url));
      }
    };
  }
  huComposite.$inject = ['$q', '$injector'];

  function applyInterceptorChain(promise, chain) {
    angular.forEach(chain, function iterator(obj) {
      promise = promise.then(obj.resolve, obj.reject);
    });
    return promise;
  }

})(window.angular);
