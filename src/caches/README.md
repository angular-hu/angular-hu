## httpu.caches

Factory, api compatible with [`$cacheFactory`](https://docs.angularjs.org/api/ng/service/$cacheFactory), that creates [LRU caches](https://github.com/jmendiara/serialized-lru-cache) with support for:
 * Serialization to storage (`storage`) example: `localStorage`, `sessionStorage`
 * Entries expiration (`maxAge`) example: 60 seconds
 * Custom serialization/compression of values (`serializer`) example: [`lz-string`](https://github.com/pieroxy/lz-string) compression
 * Limited number of entries in the cache (`capacity`) example: 10 entries

      OR

 * Limited length of cache (`maxLength`) example: 2 Megabytes

The returned cache is again API compatible with angular [`$cacheFactory.Cache`](https://docs.angularjs.org/api/ng/type/$cacheFactory.Cache)

Characteristics:
 * Items are not pro-actively pruned out as they age, but if you try to get an item that is too old,
   it'll drop it and return `undefined` instead of giving it to you. A convenience `cache.prune()` method
   is exported to allow you to prune the cache whenever you want
 * If you put more stuff in it than it can handle, then least used items items will fall out.
 * If you try to put an oversized thing in it, then it'll fall out right away.
 * Adaptation to change: serialized data is agnostic of the creation options, and you can update
   your code to use a cache with different options and still use the cached data in the storage
   (as long as you keep the same serializaration implementation)

# Installation

Get it from [bower](http://bower.io/) or directly download it.

```sh
bower install --save angular-hu-caches
```

Add the dependencies to the HTML

```html
<script type="text/javascript" src="bower_components/serialized-lru-cache/lib/lru-cache.js"></script>
<script type="text/javascript" src="bower_components/angular-hu-cacherp/caches.js"></script>
```

Add the `httpu.caches` dependency to your App Module

```js
angular.module('MyApp', ['httpu.caches']);
```

The `huCacheSerializableFactory` dependency is now available

### Usage

```js
//Direct replacement of $cacheFactory, in localStorage
//Creates a cache of 50 entries saved to localStorage
var cache = huCacheSerializableFactory('myCache', {
  capacity: 50
});

//Cache whose 50 entries expire after 2 minutes, in sessionStorage
var cache = huCacheSerializableFactory('myCache', {
  capacity: 50,
  maxAge: 2 * 60 * 1000, //2 minutes in milliseconds
  storage: $window.sessionStorage
});

//2 MB cache whose entries expire after 10 minutes, in localStorage
var cache = huCacheSerializableFactory('myCache', {
  maxLength: 2 * 1024 * 1024, // 2MB of chars
  maxAge: 10 * 60 * 1000 //10 minutes in milliseconds
});

//1MB cache with compression in local storage
//You must create a dependency with the folling API
angular.module('myApp').factory('myCompressSerializer', function($window) {
  //add lz-string module to your included scripts
  //https://github.com/pieroxy/lz-string
  return {
     stringify: function(obj) {
       return $window.LZString.compress(JSON.stringify(obj));
     },
     parse: function(str) {
       return JSON.parse($window.LZString.decompress(str));
     }
  };
});

var cache = huCacheSerializableFactory('myCache', {
  maxLength: 1 * 1024 * 1024, // 1MB of compressed chars
  serializer: 'myCompressSerializer'
});

```

### Use cases

* You want to save caches to a storage to allow returning users to read from them
* You want to limit the amount of data stored instead of the number of requests
* You want entries to expire after some time
* You want to compress the data to allow more request to be cached in the 5MB storage that the browsers are giving
* You want to resize your caches with new options for returning visitors
