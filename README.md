# Angular HTTP Utils [![Build Status](https://travis-ci.org/angular-hu/angular-hu.svg)](https://travis-ci.org/angular-hu/angular-hu) [![Coverage Status](https://coveralls.io/repos/angular-hu/angular-hu/badge.svg)](https://coveralls.io/r/angular-hu/angular-hu)
Angular $http utilities to deal with common problems when accessing backends

## Use cases

You want to...

* [httpu.caches](src/caches/): Save caches to localstorage to allow returning users to read from them; limit the amount of data stored instead of the number of requests; entries to expire after some time; compress the data to allow more request to be cached in the 5MB storage that the browsers are giving; resize your caches with new options for returning visitors.
* [httpu.composite](src/composite/): Your app access several Backends, and have some backend specific interceptors (Authorization, error management...) for each one; You have interceptors that implements some plug&play feature, and belongs to a certain module; You download your templates from your server, and query a different API backend using several interceptors
* [httpu.urlbuilder](src/urlbuilder/): You have a backend that doesn't understand the current param serialization from angular, and you have to code the serialized url directly in the url used for the request, losing the power of having it as a plain object.
* [httpu.headers](src/headers/): Know the final URL used for your request (this may be computed by $http before leaving to $httpBackend) to delete cache entries, log them...; Wanna collect statistics information for your backend responses accessed over the worldwide clients; You wanna know if the request you performed hit your `$http` request cache.
* [httpu.cacherp](src/cacherp/): You have a backend that need variable request parameters, like oauth1 backends, and wanna cache those requests.
* [httpu.oauth1](src/oauth1/): You have one or severals backends that need oauth1 signed request, with different configurations.
* [httpu.retry](src/retry/): You have several retry strategies based on some backend specific errors.

## Install

You can get it from [Bower](http://bower.io/)

```sh
## add --save to every command to save to your bower.json
# Install specific module
bower install angular-hu-cacherp
bower install angular-hu-retry
bower install angular-hu-oauth1
bower install angular-hu-headers
bower install angular-hu-caches
bower install angular-hu-composite
bower install angular-hu-urlbuilder
```

## Usage

After installing, HTTP Utils files will be available into a `bower_components` folder, along with its dependencies.

```html
<script type="text/javascript" src="bower_components/angular/angular.js"></script>
<!-- add your specific module -->
<script type="text/javascript" src="bower_components/angular-hu-cacherp/cacherp.js"></script>
<script type="text/javascript" src="bower_components/angular-hu-retry/retry.js"></script>
<script type="text/javascript" src="bower_components/angular-hu-headers/headers.js"></script>
<script type="text/javascript" src="bower_components/angular-hu-urlbuilder/urlbuilder.js"></script>
<script type="text/javascript" src="bower_components/angular-hu-composite/composite.js"></script>

<!-- oauth1 has an external dependency -->
<script type="text/javascript" src="bower_components/oauth-signature-js/dist/oauth-signature.js"></script>
<script type="text/javascript" src="bower_components/angular-hu-oauth1/oauth1.js"></script>

<!-- caches has an external dependency -->
<script type="text/javascript" src="bower_components/lru-cache/lib/lru-cache.js"></script>
<script type="text/javascript" src="bower_components/angular-hu-caches/caches.js"></script>
<!-- ... -->
```

Add the specific modules to your dependencies, or add the entire lib by depending on `httpu`

```javascript
angular.module('myApp', ['httpu.caches', 'httpu.retry', 'httpu.oauth1', ...]);
```

Each one is now it's own module and will have a relevant README.md in their respective folders

## Development

#### Single test
```sh
npm run test
```

#### Continuous testing
Will execute karma and watch the files to run the test on every save

```sh
npm run watch
```

#### Code coverage
```sh
npm run coverage
```

#### Coding guidelines
```sh
npm run lint
```

## LICENSE

The MIT License ([MIT](LICENSE))

Copyright (c) 2015 Telefónica I+D - http://www.tid.es
