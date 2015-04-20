
describe('http.oauth1', function() {
  'use strict';
  var now = new Date().getTime();

  beforeEach(module('httpu.oauth1'));

  beforeEach(module(function($provide) {
    sandbox.useFakeTimers(now);
    $provide.decorator('$window', function($delegate) {
      $delegate.oauthSignature = {
        generate: function() {
          return 'testsignature';
        }
      };
      $delegate.Math.random = function() {
        return 0;
      };
      return $delegate;
    });
    $provide.factory('myOAuthInterceptor', ['huOAuth1InterceptorFactory',
      function(huOAuth1InterceptorFactory) {
        return huOAuth1InterceptorFactory();
      }]);
  }));

  describe('with default config', function() {
    beforeEach(module(function($httpProvider) {
      $httpProvider.interceptors.push('myOAuthInterceptor');
    }));

    it('should sign the request', inject(function($httpBackend, $http) {
      $httpBackend.expectGET('/?' + [
        'oauth_consumer_key=key',
        'oauth_nonce=00000000000',
        'oauth_signature=testsignature',
        'oauth_signature_method=HMAC-SHA1',
        'oauth_timestamp=' + Math.floor(now / 1000),
        'oauth_version=1.0'
      ].join('&')).respond(200, 'OK');

      $http.get('/', {
        oauth1: {
          consumerKey: 'key',
          consumerSecret: 'secret'
        }
      });

      $httpBackend.flush();
    }));

    it('should do nothing with no oauth config', inject(function($httpBackend, $http) {
      $httpBackend.expectGET('/').respond(200, 'OK');
      $http.get('/');
      $httpBackend.flush();
    }));

    it('should reject with invalid config', inject(function($timeout, $http) {
      $http.get('/', {
        oauth1: {}
      }).catch(function(response) {
        expect(response.error.message).to.be.eql('MissingKeySecret');
      });
      $timeout.flush();
    }));
  });

  describe('with custom timestamp getter', function() {

    it('should fail sign the request', function() {
      module(function($provide, $httpProvider) {
        $provide.factory('testGetTimestamp', ['$q', function($q) {
          return function() {
            return $q.reject(new Error('TestFail'));
          };
        }]);
        $httpProvider.interceptors.push(['huOAuth1InterceptorFactory',
          function(huOAuth1InterceptorFactory) {
            return huOAuth1InterceptorFactory({
              getTimestamp: 'testGetTimestamp'
            });
          }]);
      });

      inject(function($timeout, $http) {
        $http.get('/', {
          oauth1: {
            consumerKey: 'key',
            consumerSecret: 'secret'
          }
        }).catch(function(response) {
          expect(response.error.message).to.be.eql('TestFail');
        });
        $timeout.flush();
      });
    });
  });
});
