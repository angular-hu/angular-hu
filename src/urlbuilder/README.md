## httpu.urlbuilder

Allows specifiying how an URL is built. In other words, allows you to customize how the `params` option in a [$http](https://docs.angularjs.org/api/ng/service/$http) request is converted to a queryString other than the default [`angular`](https://github.com/angular/angular.js/blob/v1.3.x/src/ng/http.js#L1136) way. Gives you the foundation to implement [`jquery`](http://api.jquery.com/jquery.param/) url builder and other backend specific serializations

### Installation

Get it from [bower](http://bower.io/) or directly download it.

```sh
bower install --save angular-hu-urlbuilder
```

Add the dependency in the HTML

```html
<script type="text/javascript" src="bower_components/angular-hu-urlbuilder/urlbuilder.js"></script>
```

Add the `httpu.urlbuilder` dependency to your App Module

```js
angular.module('MyApp', ['httpu.urlbuilder']);
```

The `huURLBuilderInterceptor` and `huURLBuilderFactory` dependencies are now available

### Usage

```js
angular.module('MyApp')
//Add the interceptor that will make the serialization.
.config(function($httpProvider) {
  $httpProvider.interceptors.push('huURLBuilderInterceptor');
})
.factory('pirateBuildUrl', function(huURLBuilderFactory) {
  //this is how a `params` object is serialized
 //you must call the `addKeyValue` with *all* your final key, value pairs.
 //this serializer converts params to Pirate Language
 function pirateSerializer(params, addKeyValue) {
    //params is the $http request `params` option property
    angular.forEach(params, function(value, key) {
      addKeyValue('ARR' + key, 'RUM' + value);
    });
  }

  return huURLBuilderFactory(pirateSerializer);
})
.run(function($http, huURLBuilderFactory) {

  //Make a request
  $http.get('http://myapi.com/things', {
    params: {
      id: 5
    },
    //specify the url builder
    buildUrl: 'pirateBuildUrl'
  });
  // GET http://myapi.com/things?ARRid=RUM5
});
```

### Use cases

* You have a backend that doesn't understand the current param serialization from
angular, and you have to code the serialized url directly in the url used for the
request, losing the power of having it as a plain object.

