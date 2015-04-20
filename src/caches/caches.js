(function(angular) {
  'use strict';

  angular.module('httpu.caches', [])
    .factory('huCacheSerializableFactory', huCacheSerializableFactory);

  function huCacheSerializableJSONSerializer() {
    return {
      stringify: JSON.stringify,
      parse: JSON.parse
    };
  }
  huCacheSerializableJSONSerializer.$inject = [];

  /**
   * Synchronous Storage Factory for a lruCache that will be serialized to a storage
   * Implements a Helper to allow memory caches to flush and load from a
   * Storage (localStorage/sessionStorage).
   *
   * Features:
   * - Optimization for I/O access, flushing LRU information in next event loop
   * - Delegates how a cache entry is serialized
   * - Best effort on full storages: removes the least used entry
   *
   *
   * @param {Object} $timeout from 'ng' module
   * @returns {Function}
   */
  function huCacheSerializableSyncStorageFactory($timeout) {
    return function(opt, lruCache) {

      var flushScheduled,
          stringifyCache = {},
          entryKey = 'hucsss.' + opt.id,
          lruKey = entryKey + '.l',
          storage = opt.storage,
          serializer = opt.serializer;

      return {
        put: put,
        remove: remove,
        get: get,
        destroy: destroy,
        load: load,
        lengthCalculator: lengthCalculator
      };

      //////////////////////////////////////////

      function getKey(itemKey) {
        return entryKey + '.i.' + (itemKey || '');
      }

      function isPromiseLike(item) {
        return item && typeof item.then === 'function';
      }

      function tryWrite(key, value) {
        try {
          storage.setItem(key, value);
          return true;
        } catch (err) {
          return false;
        }
      }

      /**
       * Writes a key value to storage. When storage is full,
       * it will try to remove staled items (prune the cache)
       * and then will drop the least used from storage.
       *
       * @param {String} key
       * @param {Object} value
       */
      function write(key, value) {
        if (!tryWrite(key, value)) {
          //storage is full. Lets prune and save the good entries
          var items = [];
          lruCache.forEach(function(iValue, iKey) {
            items.push({
              k: iKey,
              v: iValue
            });
          });
          //The lru cache is pruned, and staled items removed, from memory and from
          //the storage! Try again
          if (!tryWrite(key, value)) {
            //Nop! Still full
            //Lets try to remove older items
            for (var i = items.length - 1; i >= 0; --i) {
              var item = items[i];
              //We remove the item from the storage, but we will keep it in the lru.
              // As it's in the lruCache, it will be available in memory
              //but once the cache is reloaded, it will be automatically pruned by
              //the load method
              remove(item.k, item.v);
              if (tryWrite(key, value)) {
                break;
              }
            }
          }
        }
      }

      /**
       * Gets an LRU representation for the cache
       * @returns {Object<key, timestamp>} an lru
       */
      function getLRU() {
        var lru = {};
        angular.forEach(lruCache.toJSON(), function iterator(hit) {
          if (!isPromiseLike(hit.v)) {
            lru[hit.k] = hit.n;
          }
        });
        return lru;
      }

      /**
       * Writes the LRU to storage
       */
      function putLRU() {
        stringifyCache = {};
        var lru = JSON.stringify(getLRU());
        write(lruKey, lru);
      }

      /**
       * Writes a key, value to the storage. Schedules a LRU flush
       *
       * @param {String} key
       * @param {Object} value
       */
      function put(key, value) {
        if (!isPromiseLike(value)) {
          var str;
          //We may have this hit selialized, in load or in the lengthCalculator
          if (angular.isDefined(stringifyCache[key])) {
            str = stringifyCache[key];
            //Delete it to allow several cache.put() with an updated value in the same cycle
            delete stringifyCache[key];
          } else {
            str = serializer.stringify(value);
          }
          write(getKey(key), str);
          flush();
        }
      }

      /**
       * Removes a key, value to the storage. Schedules a LRU flush
       *
       * @param {String} key
       * @param {Object} value
       */
      function remove(key, value) {
        if (!isPromiseLike(value)) {
          storage.removeItem(getKey(key));
          flush();
        }
      }

      /**
       * Gets a key, value to the storage. This is an empty
       * function except for the needed LRU flush
       *
       * @param {String} key
       * @param {Object} value
       */
      function get(key, value) {
        if (!isPromiseLike(value)) {
          flush();
        }
      }

      /**
       * Destroys the storage and its entries
       */
      function destroy() {
        $timeout.cancel(flushScheduled);
        stringifyCache = null;
        angular.forEach(keys(), function iterator(key) {
          storage.removeItem(key);
        });
        storage.removeItem(lruKey);
      }

      /**
       * Flushes the cache to the storage. It is not performed inmediately, but
       * scheduled to the next event in the loop. This allows to bulk removal/read of items
       * in the cache during the same cycle
       */
      function flush() {
        if (!flushScheduled) {
          flushScheduled = $timeout(function() {
            putLRU();
            flushScheduled = null;
          });
        }
      }

      /**
       * Reads the seliarized item keys from the storage for the current cache
       * @returns {Array}
       */
      function keys() {
        var storedKeys = [],
            prefix = getKey();

        for (var i = 0, len = storage.length; i < len; i++) {
          var key = storage.key(i);
          if (key.indexOf(prefix) !== -1) {
            storedKeys.push(key);
          }
        }
        return storedKeys;
      }

      /**
       * Prunes those entries that are no longer valid (after loading a cache
       * from storage) because they expired or are not present in the LRU
       */
      function prune() {
        var storedKeys = keys(),
            validKeys = [];

        angular.forEach(lruCache.toJSON(), function iterator(item) {
          validKeys.push(getKey(item.k));
        });

        angular.forEach(storedKeys, function iterator(key) {
          if (validKeys.indexOf(key) === -1) {
            storage.removeItem(key);
          }
        });
        putLRU();
      }

      /**
       * Loads a serialized cache in the storage and fills the lruCache
       */
      function load() {
        var data = [],
            lru;

        try {
          lru = JSON.parse(storage.getItem(lruKey));
        } catch (err) {}

        angular.forEach(lru, function iterator(timestamp, key) {
          var stringValue = storage.getItem(getKey(key));
          //Maybe some evil user has deleted the entry in the storage...
          if (stringValue !== null) {
            try {
              var value = serializer.parse(stringValue);
              stringifyCache[key] = stringValue;
              data.push({
                k: key,
                v: value,
                n: timestamp
              });
            } catch (err) {}
          }
        });

        lruCache.load(data);
        prune();
      }

      /**
       * Calculates how many chars a {key, value} occupies in the storage.
       * Delegates the serialized length to the current storage implementation and
       * adds the number of chars this
       * @param {String} key
       * @param {Object} value
       * @returns {*}
       */
      function lengthCalculator(key, value) {
        //Everything in the localstorage computes as a char, including the keys
        if (isPromiseLike(value)) {
          //promises are not stored
          return 0;
        }
        //When you put an item in the lruCache, it first calculates its length
        //Store in the internal stringifyCache for put it later, and stringify things only once.
        //Also, when loading a cache from storage, we have this value serialized and stored
        //in the stringifyCache.
        stringifyCache[key] = stringifyCache[key] || serializer.stringify(value);
        //the value length
        return stringifyCache[key].length +
            //the key length
            getKey(key).length +
            //the key in the LRU list
            key.length + 4 + // "":,
            //the timestamp in the LRU list, only for aged caches
            (opt.maxAge ? 13 : 0);
      }
    };
  }
  huCacheSerializableSyncStorageFactory.$inject = ['$timeout'];

  /**
   * Factory, api compatible with $cacheFactory, that creates LRUcaches with support for:
   * - Serialization to storage (storage) example: localStorage, sessionStorage
   * - Entries expiration (maxAge) example: 60 seconds
   * - Custom serialization/compression of values (serializer) example: lz-string compression
   * - Limited number of entries in the cache (capacity) example: 10 entries
   *   OR
   * - Limited length of cache (maxLength) example: 2 Megabytes
   *
   * The returned cache is again API compatible with angular $cacheFactory.Cache
   *
   * Characteristics:
   * - Items are not pro-actively pruned out as they age, but if you try to get an item that is too old,
   *   it'll drop it and return undefined instead of giving it to you. A convenience cache.prune() method
   *   is exported to allow you to prune the cache whenever you want
   * - If you put more stuff in it than it can handle, then least used items items will fall out.
   * - If you try to put an oversized thing in it, then it'll fall out right away.
   * - Adaptation to change: serialized data is agnostic of the creation options, and you can update
   *   your code to use a cache with different options and still use the cached data in the storage
   *   (valid only when loading a pre-existing data in caches with other maxAge, capacity or maxLength opts)
   *
   *
   * @example
   * //Direct replacement of $cacheFactory, in localStorage
   * //Creates a cache of 50 entries saved to localStorage
   * var cache = huCacheSerializableFactory('myCache', {
   *   capacity: 50
   * });
   *
   * //Cache whose 50 entries expire after 2 minutes, in sessionStorage
   * var cache = huCacheSerializableFactory('myCache', {
   *   capacity: 50,
   *   maxAge: 2 * 60 * 1000, //2 minutes in milliseconds
   *   storage: $window.sessionStorage
   * });
   *
   * //2 MB cache whose entries expire after 10 minutes, in localStorage
   * var cache = huCacheSerializableFactory('myCache', {
   *   maxLength: 2 * 1024 * 1024, // 2MB of chars
   *   maxAge: 10 * 60 * 1000 //10 minutes in milliseconds
   * });
   *
   * //1MB cache with compression in local storage
   * //You must create a dependency with the folling API
   * angular.module('myApp').factory('myCompressSerializer', function($window) {
   *   //add lz-string module to your included scripts
   *   //https://github.com/pieroxy/lz-string
   *   return {
   *      stringify: function(obj) {
   *        return $window.LZString.compress(JSON.stringify(obj));
   *      },
   *      parse: function(str) {
   *        return JSON.parse($window.LZString.decompress(str));
   *      }
   *   };
   * });
   * var cache = huCacheSerializableFactory('myCache', {
   *   maxLength: 1 * 1024 * 1024, // 1MB of compressed chars
   *   serializer: 'myCompressSerializer'
   * });
   *
   * @param {Object} $window from 'ng' module
   * @param {Object} $injector from 'ng' module
   * @returns {cacheFactory}
   */
  function huCacheSerializableFactory($window, $injector) {
    var caches = {};

    cacheFactory.info = info;
    cacheFactory.get = get;
    return cacheFactory;

    ////////////////////////////////////////

    function cacheFactory(cacheId, options) {
      options = options || {};

      if (cacheId in caches) {
        throw new Error('huCacheSerializableFactory: CacheId ' + cacheId + ' is already taken!');
      }

      if (angular.isDefined(options.capacity) && angular.isDefined(options.maxLength)) {
        throw new Error('huCacheSerializableFactory: you must choose between capacity OR maxLength');
      }
      var storageFactoryOpts = angular.extend({
        id: cacheId,
        serializer: huCacheSerializableJSONSerializer,
        storage: $window.localStorage
      }, options);

      storageFactoryOpts.serializer = getFn(storageFactoryOpts.serializer);

      var cacheOptions = {
        maxAge: options.maxAge,
        dispose: onDispose,
        length: lengthCalculator
      };

      if (angular.isDefined(options.maxLength)) {
        //We are going to use an almost-deterministic cache length strategy
        cacheOptions.max = options.maxLength;
      } else {
        //we are going to use a item size cache, as $cacheFactory does
        cacheOptions.max = options.capacity || Number.MAX_VALUE - 1;
      }

      var lruCache = new $window.LRUCache(cacheOptions),
          storage = $injector.invoke(huCacheSerializableSyncStorageFactory)(storageFactoryOpts, lruCache);

      function onDispose(key, value) {
        storage.remove(key, value);
      }

      function lengthCalculator(value, key) {
        return storage.lengthCalculator.call(storage, key, value);
      }

      if (!angular.isDefined(options.maxLength)) {
        //Overwrite any length calculator to use an static count
        storage.lengthCalculator = function() {
          return 1;
        };
      }

      storage.load();

      caches[cacheId] = {
        /**
         * Inserts a named entry into the Cache object to be
         * retrieved later, and incrementing the size of the cache if the key was not already
         * present in the cache.
         *
         * It will not insert undefined values into the cache.
         *
         * If the cache has been created with capacity option, it will count one item
         * If the cache has been created with maxLength option, it will count its serialized size
         *
         * @param {string} key the key under which the cached data is stored.
         * @param {*} value the value to store alongside the key. If it is undefined, the key
         *    will not be stored.
         * @returns {*} the value stored.
         */
        put: function put(key, value) {
          //LRUCache returns true when added, false when does not fit in the max length
          if (angular.isUndefined(value)) {
            return undefined;
          }
          var success = lruCache.set(key, value);
          if (success) {
            storage.put(key, value);
          }
          return success ? value : undefined;
        },

        /**
         * Retrieves named data stored in the cache object.
         *
         * @param {string} key the key of the data to be retrieved
         * @returns {*} the value stored.
         */
        get: function get(key) {
          var value = lruCache.get(key);
          if (value) {
            //Tell the get to storage, to flush the new LRU
            //When we retrieve an staled hit, LRUCache removes it and a flush will
            //be scheduled (by onDispose callback)
            storage.get(key, value);
          }
          return value;
        },

        /**
         * Removes an entry from the cache object.
         *
         * @param {string} key the key of the entry to be removed
         */
        remove: function remove(key) {
          //LRUCache calls automatically dispose, that will remove from
          //the storage
          lruCache.del(key);
        },

        /**
         * Clears the cache object of any entries.
         */
        removeAll: function removeAll() {
          //LRUCache calls automatically dispose, that will remove from
          //the storage
          lruCache.reset();
        },

        /**
         * Destroys the cache object entirely,
         * removing it from both the cacheFactory set and the storage.
         */
        destroy: function destroy() {
          storage.destroy();
          storage = null;
          lruCache = null;
          delete caches[cacheId];
        },

        /**
         * Retrieve information regarding a particular cache.
         *
         * @returns {object} an object with the following properties:
         *   <ul>
         *     <li>**id**: the id of the cache instance</li>
         *     <li>**size**: the number of entries kept in the cache instance</li>
         *     <li>**...**: any additional properties from the options object when creating the
         *       cache.</li>
         *   </ul>
         *
         * @returns {*|void|Object}
         */
        info: function info() {
          var ret = angular.extend({}, options, {
            id: cacheId,
            size: lruCache.itemCount
          });
          //https://github.com/angular/angular.js/issues/4751
          ret.length = lruCache.length;
          return ret;
        },

        /**
         * Removes staled (expired) items from the cache and its storage
         */
        prune: function prune() {
          lruCache.forEach(angular.noop);
        }
      };

      return caches[cacheId];
    }

    /**
     * Get information about all the caches that have been created
     *
     * @returns {Object} - key-value map of `cacheId` to the result of calling `cache#info`
     */
    function info() {
      var information = {};
      angular.forEach(caches, function(cache, cacheId) {
        information[cacheId] = cache.info();
      });
      return information;
    }

    /**
     * Get access to a cache object by the `cacheId` used when it was created.
     *
     * @param {string} cacheId Name or id of a cache to access.
     * @returns {object} Cache object identified by the cacheId or undefined if no such cache.
     */
    function get(cacheId) {
      return caches[cacheId];
    }

    function getFn(ref) {
      return angular.isString(ref) ? $injector.get(ref) : $injector.invoke(ref);
    }
  }
  huCacheSerializableFactory.$inject = ['$window', '$injector'];

})(window.angular);
