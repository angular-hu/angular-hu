
describe('httpu.cacherp', function() {
  'use strict';

  var cache,
      cache2,
      baseURL = 'http://foo.com/bar',
      removableParams = ['removeme', 'andme'],
      qs = '?' + removableParams.map(function iterator(param) {
        return param + '=value';
      }).join('&');

  beforeEach(module('httpu.cacherp'));

  beforeEach(inject(function(huCacherp, $cacheFactory, huCacherpFactory) {
    cache = huCacherpFactory('test', { removableParams: removableParams });
    cache2 = huCacherp($cacheFactory('testDecorator'), removableParams);
  }));

  it('should remove undesired parameters before entering into cache', function() {
    var completeURL = baseURL + qs;
    cache.put(completeURL, 'data');
    expect(cache.get(baseURL)).to.exist;
    expect(cache.get(completeURL)).to.exist;
    cache.remove(completeURL);
    expect(cache.info()).to.have.property('size', 0);

    cache2.put(completeURL, 'data');
    expect(cache2.get(baseURL)).to.exist;
    expect(cache2.get(completeURL)).to.exist;
    cache2.remove(completeURL);
    expect(cache2.info()).to.have.property('size', 0);
  });

  it('should remove undesired parameters with no value before entering into cache', function() {
    var completeURL = baseURL + '?removeme';
    cache.put(completeURL, 'data');
    expect(cache.get(baseURL)).to.exist;
    expect(cache.get(completeURL)).to.exist;
    cache.remove(completeURL);
    expect(cache.info()).to.have.property('size', 0);

    cache2.put(completeURL, 'data');
    expect(cache2.get(baseURL)).to.exist;
    expect(cache2.get(completeURL)).to.exist;
    cache2.remove(completeURL);
    expect(cache2.info()).to.have.property('size', 0);
  });

  it('should maintain sorted remaining parameters before putting into cache', function() {
    var completeURL = baseURL + qs + '&' + ['a','c','b'].join('&');
    cache.put(completeURL, 'data');
    expect(cache.get(baseURL + '?' + ['a','b','c'].join('&'))).to.exist;
    expect(cache.get(completeURL)).to.exist;
    cache.remove(completeURL);
    expect(cache.info()).to.have.property('size', 0);

    cache2.put(completeURL, 'data');
    expect(cache2.get(baseURL + '?' + ['a','b','c'].join('&'))).to.exist;
    expect(cache2.get(completeURL)).to.exist;
    cache2.remove(completeURL);
    expect(cache2.info()).to.have.property('size', 0);
  });

  it('should behave normaly with no URLs', function() {
    var key = 'some removeme';
    cache.put(key, 'data');
    expect(cache.get(key)).to.exist;
    cache.remove(key);
    expect(cache.info()).to.have.property('size', 0);

    cache2.put(key, 'data');
    expect(cache2.get(key)).to.exist;
    cache2.remove(key);
    expect(cache2.info()).to.have.property('size', 0);
  });

  it('should have removableParams in the info', function() {
    expect(cache.info()).to.have.property('removableParams', removableParams);
    expect(cache2.info()).to.have.property('removableParams', removableParams);
  });

  it('should be a normal cache if no configuration with removable ' +
      'params was provided', inject(function(huCacherpFactory) {
    var completeURL = baseURL + qs;

    cache = huCacherpFactory('test2');

    cache.put(completeURL, 'data');
    expect(cache.get(baseURL)).to.not.exist;
    expect(cache.get(completeURL)).to.exist;
    cache.remove(completeURL);
    expect(cache.info()).to.have.property('size', 0);

  }));

});
