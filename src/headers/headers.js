(function(angular) {
  'use strict';
  angular.module('httpu.headers', [])
    .config(config);

  function config($provide) {
    $provide.decorator('$httpBackend', ['$delegate', decorator]);
  }
  config.$inject = ['$provide'];

  function decorator($httpBackend) {
    //ngMock and maybe other decorators can put properties in functions
    //With ES6 proxies it will be easy than this hack
    angular.forEach($httpBackend, function(prop, key) {
      wrap[key] = prop;
    });
    return wrap;

    //function(method, url, post, callback, headers, timeout, withCredentials, responseType)
    function wrap() {
      var args = Array.prototype.slice.call(arguments),
        callback = args[3],
        url = args[1], //url
        startRequest = new Date().getTime();

      args[3] = callbackDecorator; //callback
      return $httpBackend.apply(this, args);

      ////////////////////////////

      //$http.done(status, response, headersString, statusText)
      function callbackDecorator() {
        var callBackArgs = Array.prototype.slice.call(arguments),
            endRequest = new Date().getTime(),
            headersString = callBackArgs[2]; //headersString

        headersString = headersString || '';
        headersString += '\nhttpu-request-time: ' + (endRequest - startRequest);
        headersString += '\nhttpu-request-url: ' + url;

        callBackArgs[2] = headersString;

        callback.apply(this, callBackArgs);
      }
    }
  }
})(window.angular);
