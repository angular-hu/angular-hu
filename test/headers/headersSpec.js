describe('httpu.headers', function() {
  'use strict';

  beforeEach(module('httpu.headers'));

  beforeEach(inject(function($httpBackend) {
    $httpBackend.when('GET', '/myserver?query').respond({foo: 'bar'}, {
      'BackendHeader': 'xxx'
    });
  }));

  it('Should add headers to every outgoing request', inject(function($httpBackend, $http) {
    $http.get('/myserver?query').then(function(response) {
      expect(response.headers('BackendHeader')).to.be.eql('xxx');
      expect(response.headers('httpu-request-time')).to.be.defined;
      expect(response.headers('httpu-request-url')).to.be.eql('/myserver?query');
    });
    $httpBackend.flush();
  }));

  it('Should add headers to a timeouted request', inject(function($httpBackend, $http, $q, $timeout) {
    $http.get('/myserver?query', {
      timeout: $q.when()
    }).catch(function(response) {
      expect(response.headers('BackendHeader')).to.not.be.defined;
      expect(response.headers('httpu-request-time')).to.be.defined;
      expect(response.headers('httpu-request-url')).to.be.eql('/myserver?query');
    });
    $timeout.flush();
  }));

  it('should decorate caches to add the timestamp', inject(function(huFromCache, $cacheFactory, $http, $httpBackend, $timeout) {

    var cache = huFromCache($cacheFactory('test'));

    $http.get('/myserver?query', {
      cache: cache
    }).then(function(response) {
      expect(response.headers('BackendHeader')).to.be.eql('xxx');
      expect(response.headers('httpu-cached-at')).to.not.be.defined;
    });

    $httpBackend.flush();

    $http.get('/myserver?query', {
      cache: cache
    }).then(function(response) {
      expect(response.headers('BackendHeader')).to.be.eql('xxx');
      expect(response.headers('httpu-cached-at')).to.be.defined;
    });
    $timeout.flush();
    $httpBackend.verifyNoOutstandingRequest();
  }));
});
