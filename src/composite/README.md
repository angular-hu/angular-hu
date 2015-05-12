## httpu.composite

Exposes a factory that creates an [interceptor](https://docs.angularjs.org/api/ng/service/$http#interceptors) that groups interceptors, to be traversed for specific backends. Implements the [composite pattern](http://en.wikipedia.org/wiki/Composite_pattern).

### Installation

Get it from [bower](http://bower.io/) or directly download it.

```sh
bower install --save angular-hu-composite
```

Add the dependency in the HTML

```html
<script type="text/javascript" src="bower_components/angular-hu-composite/composite.js"></script>
```

Add the `httpu.composite` dependency to your App Module

```js
angular.module('MyApp', ['httpu.composite']);
```

The `huComposite` dependency is now available

### Usage

```js
angular.module('MyApp')
//Create an interceptor of interceptors
.factory('myAPIInterceptors', function(huComposite) {
  return huComposite([
    'myOAuthInterceptor', //you can also register interceptors via an anonymous factory
    'myRetryInterceptor',
    'myStatisticsInterceptor'
  ], {
    //these interceptors will only be called when `myAPI` property is available in the request config
    flag: 'myAPI'
    //OR when the request URL satisfies the following RegExp
    backend: /^\/api/
  });
})
// Add the new interceptor to the interceptors chain
.config(function($httpProvider) {
  $httpProvider.interceptors.push('myAPIInterceptors');
})
//Now, these interceptors will only be called when the request config includes a truthy value for `myAPI` parameter
.run(function($http) {
  //This request will traverse your interceptors
  $http.get('/api', {
    myAPI: {  //Set it to `true` or to your API specific parameters managed in your interceptors
      param: 'value'
    }
  });

  //This request will traverse your interceptors,
  $http.get('/api');

  //Other requests (including server templates) without myAPI param or to other backend, will not traverse them
  $http.get('http://lwitter.com/lweets');
});
```

### [Live Example](http://codepen.io/jmendiara/pen/jPELOw?editors=101)

### Use cases

* Your app access several Backends, and have some backend specific interceptors (Authorization, error management...) for each one.
* You have interceptors that implements some plug&play feature, and belongs to a certain module.
* You download your templates from your server, and query a different API backend using several interceptors.


