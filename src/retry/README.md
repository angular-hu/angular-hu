## httpu.retry

Factory to create interceptors that retry the failed request based on some conditions

### Installation

Get it from [bower](http://bower.io/) or directly download it.

```sh
bower install --save angular-hu-retry
```

Add the dependency in the HTML

```html
<script type="text/javascript" src="bower_components/angular-hu-retry/retry.js"></script>
```

Add the `httpu.retry` dependency to your App Module

```js
angular.module('MyApp', ['httpu.retry']);
```

The `huRetryInterceptorFactory` dependency is now available

### Usage

```js
angular.module('MyApp')
.run(function($http) {
  //retry 3 times before giving up. (the original request + 3 retries = 4 request)
  $http.get('http://myapi.com/things', {
    retries: 3
  });
})
//SIMPLE USAGE: retry everything
.config(function($httpProvider) {
  // Add a default interceptor instantiation
  $httpProvider.interceptors.push(['huRetryInterceptorFactory', function(huRetryInterceptorFactory) {
    return huRetryInterceptorFactory();
  }]);
})
//MEDIUM USAGE: Retry with a 503 error.
.config(function($httpProvider) {
  $httpProvider.interceptors.push('retryOn503Interceptor');
})
.factory('retryOn503Interceptor', function(huRetryInterceptorFactory, $q, $timeout) {
  //return an interceptor that specifies the conditions for retry
  return huRetryInterceptorFactory({
    //this func will be called when there are remaining request. i.e. `retries` field in the request config 
    //is still greater than 0.
    //So, it's called when a retry is about to be performed, allowing you to cancel the retry
    // Useful when you don't want to retry a request based on some rejection parameters
    // Must return a promise resolving to a boolean, allowing you to perform an async operation before retrying,
    // or a boolean which means the desire of retrying
    shouldRetry: function(rejection) {
      //rejection is the paramter passed to https://docs.angularjs.org/api/ng/service/$http responseError interceptor
      if (rejection.status === 503) {
        //If my api response is a 503 error, retry the after 2 secs
        return $timeout(function() {
            return true;
          }, 2000);
      } 
      return false;
    }
    //There is also another one config parameter to the factory, called `retryField`
    //that allows you to specify the name of field to be looked in the config to determine
    // how many retries are remaining. Defaults to 'retries'
  });
});
```

### [Live example](http://codepen.io/jmendiara/pen/eNYvqO?editors=101)


### Use cases

* You have several retry strategies based on some backend specific errors
