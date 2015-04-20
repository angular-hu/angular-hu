
describe('huURLBuilderFactory', function() {
  'use strict';

  beforeEach(module('httpu.urlbuilder'));

  it('should serialize in string format by default', inject(function(huURLBuilderFactory) {
    var buildUrl = huURLBuilderFactory();

    var url = buildUrl('http://foo.com', {
      string: 'str',
      number: 1,
      array: [2, 'str']
    });

    expect(url).to.be.eql('http://foo.com?string=str&number=1&array=2,str');
  }));

  it('should support urls with previous search', inject(function(huURLBuilderFactory) {
    var buildUrl = huURLBuilderFactory();

    var url = buildUrl('http://foo.com?foo', {
      string: 'str'
    });

    expect(url).to.be.eql('http://foo.com?foo&string=str');
  }));

  it('should support no params', inject(function(huURLBuilderFactory) {
    var buildUrl = huURLBuilderFactory();

    var url = buildUrl('http://foo.com');

    expect(url).to.be.eql('http://foo.com');
  }));

  it('should support custom serializers', inject(function(huURLBuilderFactory) {

    function pirateSerializer(params, cb) {
      angular.forEach(params, function iterator(value, key) {
        cb('ARR' + key, 'RUM' + value);
      });
    }
    var buildUrl = huURLBuilderFactory(pirateSerializer);

    var url = buildUrl('http://foo.com', {
      string: 'str',
      number: 1
    });

    expect(url).to.be.eql('http://foo.com?ARRstring=RUMstr&ARRnumber=RUM1');
  }));

});
