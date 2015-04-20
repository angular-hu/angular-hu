describe('httpu.retry', function() {
  'use strict';
  var $provide;
  beforeEach(module('httpu.retry'));

  beforeEach(module(function($httpProvider, _$provide_) {
    $httpProvider.interceptors.push('huRetryInterceptor');
    $provide = _$provide_;
  }));

  describe('Default behavior', function() {
    var $httpBackend, $http, huRetryInterceptorFactory;

    beforeEach(inject(function($injector) {
      huRetryInterceptorFactory = $injector.get('huRetryInterceptorFactory');
      $provide.value('huRetryInterceptor', huRetryInterceptorFactory());
      // Set up the mock http service responses
      $httpBackend = $injector.get('$httpBackend');
      $http  = $injector.get('$http');
    }));

    it('should retry', function() {
      $httpBackend.expectGET('/').respond(500, 'KO');
      $httpBackend.expectGET('/').respond(200, 'OK');

      $http.get('/', {
        retries: 1
      }).then(function(response) {
        expect(response.data).to.be.equals('OK');
      });
      $httpBackend.flush();
    });


    it('should retry the configured times and fail with the last one', function() {
      $httpBackend.expectGET('/').respond(500, 'KO');
      $httpBackend.expectGET('/').respond(500, 'KO2');

      $http.get('/', {
        retries: 1
      }).then(null, function(response) {
        expect(response.data).to.be.equals('KO2');
      });
      $httpBackend.flush();
    });

    it('should not retry if no retries were specified', function() {
      $httpBackend.expectGET('/').respond(500, 'KO');

      $http.get('/').then(null, function(response) {
        expect(response.data).to.be.equals('KO');
      });
      $httpBackend.flush();
    });

    afterEach(function() {
      $httpBackend.verifyNoOutstandingExpectation();
      $httpBackend.verifyNoOutstandingRequest();
    });
  });

  describe('Customization', function() {
    var $httpBackend, $http, huRetryInterceptorFactory;


    it('should use the custom retryField', function() {
      inject(function($injector) {
        huRetryInterceptorFactory = $injector.get('huRetryInterceptorFactory');
        $provide.value('huRetryInterceptor', huRetryInterceptorFactory({
          retryField: 'myCustomRetry'
        }));
        // Set up the mock http service responses
        $httpBackend = $injector.get('$httpBackend');
        $http = $injector.get('$http');
      });

      $httpBackend.expectGET('/').respond(500, 'KO');
      $httpBackend.expectGET('/').respond(200, 'OK');

      $http.get('/', {
        myCustomRetry: 1
      }).then(function(response) {
        expect(response.data).to.be.equals('OK');
      });
      $httpBackend.flush();
    });


    it('should not retry if shouldRetry rejects', function() {
      inject(function($injector) {
        var $q = $injector.get('$q');
        huRetryInterceptorFactory = $injector.get('huRetryInterceptorFactory');
        $provide.value('huRetryInterceptor', huRetryInterceptorFactory({
          shouldRetry: function() {
            return $q.reject();
          }
        }));
        // Set up the mock http service responses
        $httpBackend = $injector.get('$httpBackend');
        $http  = $injector.get('$http');
      });

      $httpBackend.expectGET('/').respond(500, 'KO');

      $http.get('/', {
        retries: 1
      }).then(null, function(response) {
        expect(response.data).to.be.equals('KO');
      });
      $httpBackend.flush();
    });

    it('should not retry if shouldRetry returns false', function() {
      inject(function($injector) {
        var $q = $injector.get('$q');
        huRetryInterceptorFactory = $injector.get('huRetryInterceptorFactory');
        $provide.value('huRetryInterceptor', huRetryInterceptorFactory({
          shouldRetry: function() {
            return false;
          }
        }));
        // Set up the mock http service responses
        $httpBackend = $injector.get('$httpBackend');
        $http  = $injector.get('$http');
      });

      $httpBackend.expectGET('/').respond(500, 'KO');

      $http.get('/', {
        retries: 1
      }).then(null, function(response) {
        expect(response.data).to.be.equals('KO');
      });
      $httpBackend.flush();
    });

    afterEach(function() {
      $httpBackend.verifyNoOutstandingExpectation();
      $httpBackend.verifyNoOutstandingRequest();
    });
  });

});
