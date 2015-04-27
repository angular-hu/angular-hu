## httpu.oauth1

Factory that creates an [interceptor](https://docs.angularjs.org/api/ng/service/$http) to sign oauth1 requests. Once you have arrived here, you must know that _storing secrets in the client_, even for signing requests, is **not** safe. The secret you will use in this module can be seen by anybody. 

### Installation

Get it from [bower](http://bower.io/) or directly download it.

```sh
bower install --save angular-hu-oauth1
```

Add the oauth1 and the signature generation dependency in the HTML

```html
<script type="text/javascript" src="bower_components/oauth-signature-js/dist/oauth-signature.js"></script>
<script type="text/javascript" src="bower_components/angular-hu-oauth1/oauth1.js"></script>
```

Add the `httpu.oauth1` dependency to your App Module

```js
angular.module('MyApp', ['httpu.oauth1']);
```

The `huOAuth1InterceptorFactory` dependency is now available

### Usage

```js
angular.module('MyApp')
.config(function($httpProvider) {
  $httpProvider.interceptors.push('oauthInterceptor');
})
//Create your specific backend oauth implementation to be added to your request interceptors
.factory('oauthInterceptor', function(huOAuth1InterceptorFactory) {
  //all parameters are optional.
  //Refer to source code for default implementations and more instantiation options are below
  return huOAuth1InterceptorFactory({
    getTimestamp: myTimestampGetter //oauth must be signed with your server time. 
  });
})
.run(function($http) {
  $http.get('http://myapi.com/things', {
    params: {
      id: 5
    },
    oauth1: {
      consumerKey: 'myConsumerKey',
      consumerSecret: 'myConsumerSecret'
    }
  });
  //GET http://myapi.com/things?id=5&oauth_consumer_key=myConsumerKey&oauth_nonce=W5x7uncL3ni&oauth_timestamp=123434334&oauth_signature=9frD%2Bwl4j6zsXtztwWHIRqFKmu8%3D&oauth_signature_method=HMAC-SHA1&oauth_version=1.0
});
```

### Options
Options to pass to `huOAuth1InterceptorFactory` at instantiation time 

#### getTimestamp
Function to retrieve the server timestamp. Must return `Number` or a promise resolving to a `Number` that represents the current server time in *seconds* 

```js
function myTimestampGetter() {
  return $http.get('http://myserver.com/time')
    .then(function(response) {
      return response.data;
    });
}
return huOAuth1InterceptorFactory({
    getTimestamp: myTimestampGetter //oauth must be signed with your server time. 
  });
```

#### serializer
Function to convert the request `params` property to a set of `{key, value}` strings. This set *must* be the same that angular is using to generate your URL, so refer to [`httpu.urlbuilder`](http://angular-hu.github.io/bower-urlbuilder/) module to make a DRY implementation.

```js
function mySerializer(params, addKeyValue) {
  //`params` is the request params property: {id: 5} in the above example
  //`addKeyValue` is the {Function} to call with every {key, value} set 
  angular.forEach(params, function(value, key) {
    if (angular.isDate(value)) {
      //our Backend understand dates as ISOStrings
      addKeyValue(key, value.toISOString());    
    } else {
      addKeyValue(key, String(value));
    }
  });
}
    
return huOAuth1InterceptorFactory({
    serializer: mySerializer //oauth must be signed with your server time. 
  });
```

#### createError
Function to create errors that may happen inside the interceptor. Use this method when you have some kind of error recovery executing in your interceptors chain. Creating errors on interceptors is dangerous, cause another interceptor with requestError/responseError can have other error management strategies.
This interceptor creates an error when you don't specify a `consumerKey` or `consumerSecret` in the request `oauth1` property. It also catches the possible errors in your `getTimestamp` and signature generation implementation.

The current request will be rejected with the object this function returns

```js
function myCreateError(config, error) {
  //`config` is the request config property
  //`error` is the original error that caused this interceptor to fail
  config.error = err;
  return config;
}
    
return huOAuth1InterceptorFactory({
    createError: myCreateError  
  });
```


### Use cases

* You have one or severals backends that need oauth1 signed request, with different configurations. 
