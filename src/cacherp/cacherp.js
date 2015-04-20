(function(angular) {
  /**
   * @ngdoc service
   * @name huCacherpFactory
   *
   * @description
   * Decorates {@link $cacheFactory $cacheFactory} allowing to remove some queryString parameters
   * from an URL based key.
   * This type of cache is meant to be used by $http or similar, and will
   * put in the cache URL's as keys, but with the specified parameters names (and its values)
   * removed.
   * It's very useful to cache request to timestamped signed endpoints, where there
   * are always variable parameters for security, but not for functionality: Ex: oauth1
   *
   * ```js
   *  var cache = huCacherpFactory('cacheId', {
   *    removableParams: [
   *      'oauth_nonce',
   *      'oauth_timestamp',
   *      'oauth_signature'
   *    ]
   *  }, $cacheFactory);
   *  expect($cacheFactory.get('cacheId')).toBe(cache);
   *  expect($cacheFactory.get('noSuchCacheId')).not.toBeDefined();
   *
   *  cache.put('www.foo.com/a?oauth_nonce', 'value');
   *  cache.put('another key', 'another value');
   *
   *  expect(cache.get('www.foo.com/a?oauth_nonce')).toBe('value');
   *  expect(cache.get('www.foo.com/a')).toBe('value');
   *  expect(cache.get('another key')).toBe('another value');
   *
   *  expect(cache.info()).toEqual({id: 'cacheId', size: 2});
   *
   * ```
   *
   *
   * @param {string} cacheId Name or id of the newly created cache.
   * @param {object=} options Options object that specifies the cache behavior. It's forwarded
   * to the $cacheFactory execution. Properties:
   *   - `{number=}` `removableParams` — removes the following param names from the key
   * @param {function} [cacheFactory] Optional cache Factory function. A function method
   *  with a $cacheFactory compatible API
   *
   * @returns {object} Newly created cache object with the following set of methods:
   *
   * - `{object}` `info()` — Returns id, size, and options of cache.
   * - `{{*}}` `put({string} key, {*} value)` — Puts a new key-value pair into the cache and returns it.
   * - `{{*}}` `get({string} key)` — Returns cached value for `key` or undefined for cache miss.
   * - `{void}` `remove({string} key)` — Removes a key-value pair from the cache.
   * - `{void}` `removeAll()` — Removes all cached values.
   * - `{void}` `destroy()` — Removes references to this cache from $cacheFactory.
   *
   */
  angular.module('httpu.cacherp', [])
      .factory('huCacherpFactory', httpuCacheRemovableParamsFactory);

  httpuCacheRemovableParamsFactory.$inject = ['$injector', '$document'];

  function httpuCacheRemovableParamsFactory($injector, $document) {
    'use strict';

    //URL Parser according to VanillaJS
    //http://vanilla-js.com/
    var parser = $document[0].createElement('a');

    return httpuCacheRemovableParams;

    //////////////////////////
    /**
     * Converts an assignment in to a key, value object
     * @param {String} param in form of 'key=value'
     * @returns {{key: *, value: *}}
     * @private
     */
    function toKeyValue(param) {
      var split = param.split('=');
      return {
        key: split[0],
        value: split[1]
      };
    }

    /**
     * Check if the key of an object is suitable for removal
     *
     * @param {Array.<String>} removableParameters
     * @param {{key: *, value: *}} obj
     * @returns {boolean}
     * @private
     */
    function isRemovable(removableParameters, obj) {
      return removableParameters.indexOf(obj.key) < 0;
    }

    /**
     * Concats in an Array a key, value object converted to a equality
     * of type 'key=value'
     *
     * @param {Array} memo The original array
     * @param {{key: *, value: *}} obj The object to convert
     * @returns {Array} The memo array with the 'key=value' item concatenated
     * @private
     */
    function toEquality(memo, obj) {
      var param = typeof obj.value === 'undefined' ?
          obj.key :
          obj.key + '=' + obj.value;

      return memo.concat(param);
    }

    /**
     * Sort iterator for key, value objects
     *
     * @param {{key: *, value: *}} a
     * @param {{key: *, value: *}} b
     * @returns {Number}
     * @private
     */
    function sortByKey(a, b) {
      return a.key > b.key ? 1 : -1;
    }

    /**
     * Removes the specified parameters names an its values from an url
     *
     * @param {Array({String})} removableParameters The parameters names
     *  to remove from the URL
     * @param {String} url The original url
     * @returns {String} The URL without specified parameters
     * @private
     */
    function removeParamsFromUrl(removableParameters, url) {
      parser.href = url;
      var search = parser.search.indexOf('?') === 0 ?
          parser.search.substring(1) :
          parser.search;

      if (search) {
        parser.search = search
            .split('&')
            .map(toKeyValue)
            .filter(angular.bind(null, isRemovable, removableParameters))
            .sort(sortByKey)
            .reduce(toEquality, [])
            .join('&');
      }

      //safari adds '?' to the href when search !== null,
      //but other browsers don't. Remove trailing ?
      return parser.href.substr(parser.href.length - 1) === '?' ?
          parser.href.substring(0, parser.href.length - 1) :
          parser.href;
    }

    function httpuCacheRemovableParams(cacheName, options, cacheFactory) {
      cacheFactory = cacheFactory || $injector.get('$cacheFactory');

      var cache = cacheFactory(cacheName, options),
          originalCacheGet = cache.get,
          originalCachePut = cache.put,
          originalCacheRemove = cache.remove,
          removableParams = (options && options.removableParams) || [],
          cleanUrl = angular.bind(null, removeParamsFromUrl, removableParams);

      cache.get = function huCacherpGet(url) {
        return originalCacheGet.call(cache, cleanUrl(url));
      };

      cache.put = function huCacherpPut(url, data) {
        return originalCachePut.call(cache, cleanUrl(url), data);
      };

      cache.remove = function huCacherpRemove(url) {
        return originalCacheRemove.call(cache, cleanUrl(url));
      };

      return cache;
    }
  }
})(window.angular);
