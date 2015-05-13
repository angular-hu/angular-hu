## httpu.cacherp

Factory that decorates the  [$cacheFactory.Cache](https://docs.angularjs.org/api/ng/type/$cacheFactory.Cache) created by the specified [$cacheFactory](https://docs.angularjs.org/api/ng/service/$cacheFactory). It creates caches meant to be used by the [$http](https://docs.angularjs.org/api/ng/service/$http) service that will remove some request parameters from the URL (that is used as cache key)

### Installation

Get it from [bower](http://bower.io/) or directly download it.

```sh
bower install --save angular-hu-cacherp
```

Add the dependency in the HTML

```html
<script type="text/javascript" src="bower_components/angular-hu-cacherp/cacherp.js"></script>
```

Add the `httpu.cacherp` dependency to your App Module

```js
angular.module('MyApp', ['httpu.cacherp']);
```

The `huCacherpFactory` and `huCacherp` and dependencies is now available

### Usage

```js
angular.module('MyApp')
//Decorate a cache but this cache will drop 'timestamp' queryParamter from the URL
.factory('apiCache', function(huCacherp, $cacheFactory) {
  //Decorate any cache with an array with the parameters that wouldnt be taken into account when hitting caches
  return huCacherp($cacheFactory('apiCache'), ['timestamp']);
})
//OR Create the same cache a $cacheFactory would create, but this cache will drop 'timestamp' queryParamter from the URL
.factory('apiCache', function(huCacherpFactory, $cacheFactory) {
    return huCacherpFactory(
      'apiCache',  //The cache ID
      { //options to be passed to the cacheFactory specified below.
        removableParams: [ //Array with the parameters that wouldnt be taken into account when hitting caches
          'timestamp'
        ],
        capacity: 10
      },
      $cacheFactory  //The cacheFactory that will be used for creating this decorated cache
    );
  })
.run(function($http, apiCache) {
  //Make a timestamped request, and cache response for id=5. timestamp param will be removed
  $http.get('http://myapi.com/things?id=5&timestamp=' + Date.now(), {
    cache: apiCache
  });

  //this request will hit the cache!!
  $http.get('http://myapi.com/things?id=5&timestamp=' + Date.now() + 1000, {
    cache: apiCache
  });

});
```

### [Live Example](http://codepen.io/jmendiara/pen/MwYveV?editors=101)

### Use cases

* You have a backend that need variable request parameters, like oauth1 backends, and wanna cache those requests
