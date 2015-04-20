
describe('huURLBuilderInterceptor', function() {
  'use strict';
  var $http, $httpBackend, huURLBuilderFactory, pirateUrlBuilder;

  function pirateSerializer(params, cb) {
    angular.forEach(params, function iterator(value, key) {
      cb('ARR' + key, 'RUM' + value);
    });
  }

  beforeEach(module('httpu.urlbuilder'));
  beforeEach(module(function($httpProvider, $provide) {
    $httpProvider.interceptors.push('huURLBuilderInterceptor');
    $provide.value('pirateUrlBuilder', pirateUrlBuilder);

  }));

  beforeEach(inject(function($injector) {
    $http = $injector.get('$http');
    $httpBackend = $injector.get('$httpBackend');
    pirateUrlBuilder = $injector.get('huURLBuilderFactory')(pirateSerializer);
  }));

  it('should serialize parameters and dont touch the config', inject(function() {
    $httpBackend.expectGET('/?ARRstring=RUMstr').respond(200, 'OK');

    $http.get('/', {
      params: {
        string: 'str'
      },
      buildUrl: pirateUrlBuilder
    }).then(function(res) {
      expect(res.config.url).to.be.eql('/');
      expect(res.config.params).to.be.eql({
        string: 'str'
      });
    });

    $httpBackend.flush();
  }));

  it('should serialize parameters and dont touch the config, when an error happens on backend', inject(function() {
    $httpBackend.expectGET('/?ARRstring=RUMstr').respond(400, 'KO');

    $http.get('/', {
      params: {
        string: 'str'
      },
      buildUrl: pirateUrlBuilder
    }).catch(function(res) {
      expect(res.config.url).to.be.eql('/');
      expect(res.config.params).to.be.eql({
        string: 'str'
      });
    });

    $httpBackend.flush();
  }));

  it('should support string dependencies', inject(function() {
    $httpBackend.expectGET('/?ARRstring=RUMstr').respond(200, 'OK');

    $http.get('/', {
      params: {
        string: 'str'
      },
      buildUrl: 'pirateUrlBuilder'
    }).then(function(res) {
      expect(res.config.url).to.be.eql('/');
      expect(res.config.params).to.be.eql({
        string: 'str'
      });
    });

    $httpBackend.flush();
  }));

});
