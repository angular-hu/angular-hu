# httpu.headers

Add custom, application headers, to every [$http](https://docs.angularjs.org/api/ng/service/$http)  **response**. Currently, two headers are added:
 * `httpu-request-time`: The time the request took to complete
 * `httpu-request-url`: The url used, with all the parameters
 * `httpu-cached-at`: The time a cached request was added to the cache specified in `$http`

### Installation

Get it from [bower](http://bower.io/) or directly download it.

```sh
bower install --save angular-hu-headers
```

Add the dependency in the HTML

```html
<script type="text/javascript" src="bower_components/angular-hu-headers/headers.js"></script>
```

Add the `httpu.headers` dependency to your App Module

```js
angular.module('MyApp', ['httpu.headers']);
```

### Usage

```js
angular.module('MyApp')
.factory('myCache', function(huFromCache, $cacheFactory) {
  var cache = $cacheFactory('apicache');
  return huFromCache(cache);
})
.run(function($http, myCache) {
  //Make a timestamped request, and cache response for id=5. timestamp param will be removed
  $http.get('http://myapi.com/things', {
    params: {
      id: 5
    },
    cache: myCache
  }).then(function(response) {
    console.log('The request was to the endopoint: ', response.headers('httpu-request-url'));
    console.log('The request took ', response.headers('httpu-request-time') + 'ms');
    console.log('The request was cached at', response.headers('httpu-cached-at') + 'ms');
    //'The request was to the endopoint: http://myapi.com/things?id=5
    //'The request took 123ms
    //'The request was cached at 1431335511216ms
  });
});
```

### [Live example](http://codepen.io/jmendiara/pen/MwWpzR?editors=101)

### Use cases

* You want to know the final URL used for your request (this may be computed by $http before leaving to $httpBackend) to  delete cache entries, log them...
* You wanna know if the request you performed hit your `$http` request cache
* Wanna collect statistics information for your backend responses accessed over the worldwide clients.

### Implementation details
Angular [$httpBackend](https://docs.angularjs.org/api/ng/service/$httpBackend) has been decorated, due to cross-browser incompatibilities reached while decorating `window.XMLHTTPRequest`.
