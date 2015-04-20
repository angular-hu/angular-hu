describe('httpu.retry', function() {
  'use strict';

  var flag = 'thisTest', i1, i2, $q;

  beforeEach(module('httpu.composite'));

  function valueFn(value) {return function() {return value;};}
  function reject(rejection) { return $q.reject(rejection);}
  function resolve(config) { return config; }

  function createInterceptor() {
    return {
      request: sandbox.spy(resolve),
      requestError: sandbox.spy(reject),
      response: sandbox.spy(resolve),
      responseError: sandbox.spy(reject)
    };
  }

  beforeEach(function() {
    angular.module('thisTest', [])
      .factory('thisInterceptor', ['$q', 'huComposite', function(_$q_, huComposite) {
        $q = _$q_;
        i1 = createInterceptor();
        i2 = createInterceptor();

        return huComposite([
          valueFn(i1),
          valueFn(i2)
        ], {
          flag: flag
        });
      }]);

    module('thisTest', function($httpProvider) {
      $httpProvider.interceptors.push('thisInterceptor');
    });
  });


  afterEach(inject(function($httpBackend) {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  }));

  describe('Creating composite interceptors', function() {
    it('should return an interceptor', inject(function(huComposite) {
      var composite = huComposite([]);
      expect(composite).to.have.property('request').and.to.be.a('function');
      expect(composite).to.have.property('requestError').and.to.be.a('function');
      expect(composite).to.have.property('response').and.to.be.a('function');
      expect(composite).to.have.property('responseError').and.to.be.a('function');
    }));

    it('should traverse interceptors on request', inject(function($http, $httpBackend) {
      $httpBackend.expectGET('/').respond(200, 'OK');

      var config = {};
      config[flag] = true;
      $http.get('/', config);
      $httpBackend.flush();

      expect(i1.request).to.have.been.called;
      expect(i2.request).to.have.been.called;
      expect(i1.response).to.have.been.called;
      expect(i2.response).to.have.been.called;
    }));

    it('should traverse interceptors on server error', inject(function($http, $httpBackend) {
      $httpBackend.expectGET('/').respond(400, 'KO');

      var config = {};
      config[flag] = true;
      $http.get('/', config);
      $httpBackend.flush();

      expect(i1.request).to.have.been.called;
      expect(i2.request).to.have.been.called;
      expect(i1.responseError).to.have.been.called;
      expect(i2.responseError).to.have.been.called;
    }));

    it('should traverse interceptors entering on requestError', function() {
      module(function($httpProvider) {
        $httpProvider.interceptors.unshift([function() {
          return {
            request: function(config) {
              //When rejecting in request, the rejected object
              //will go directly to the first responseError, without passing
              //to the $httpBackend. this last creates the response and adds the
              //config, lets do that trick here.
              config.config = config;
              return $q.reject(config);
            }
          };
        }]);
      });

      inject(function($http, $rootScope) {

        var config = {};
        config[flag] = true;
        $http.get('/', config);
        $rootScope.$apply();

        expect(i1.requestError).to.have.been.called;
        expect(i1.request).to.not.have.been.called;

        expect(i2.requestError).to.have.been.called;
        expect(i2.request).to.not.have.been.called;

        expect(i1.responseError).to.have.been.called;
        expect(i2.responseError).to.have.been.called;
      });
    });

    it('should not apply the composite when the flag is not enabled in config', inject(function($http, $httpBackend) {
      $httpBackend.expectGET('/').respond(200, 'OK');
      $http.get('/');
      $httpBackend.flush();

      expect(i1.request).to.not.have.been.called;
      expect(i2.request).to.not.have.been.called;
      expect(i1.response).to.not.have.been.called;
      expect(i2.response).to.not.have.been.called;

      $httpBackend.expectGET('/').respond(400, 'KO');
      $http.get('/');
      $httpBackend.flush();

      expect(i1.responseError).to.not.have.been.called;
      expect(i2.responseError).to.not.have.been.called;
    }));
  });
});
