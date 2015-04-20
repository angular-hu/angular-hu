
describe('httpu.cache', function() {
  'use strict';

  var storage, serializer, $timeout;

  beforeEach(module('httpu.caches'));

  beforeEach(module(function($provide) {
    serializer = {
      stringify: function(obj) {
        return JSON.stringify(obj);
      },
      parse: function(str) {
        return JSON.parse(str);
      }
    };
    $provide.value('testSerializer', serializer);
  }));

  beforeEach(inject(function(_$timeout_) {
    storage = createLocalStorageMock();
    $timeout = _$timeout_;
  }));

  it('should have the same angular api', inject(function(huCacheSerializableFactory) {
    var cache = huCacheSerializableFactory('testCache', {
        storage: storage
    });
    expect(cache).to.have.property('put');
    expect(cache).to.have.property('get');
    expect(cache).to.have.property('info');
    expect(cache).to.have.property('remove');
    expect(cache).to.have.property('removeAll');
    expect(cache).to.have.property('destroy');

    //Our API extra method
    expect(cache).to.have.property('prune');

    expect(huCacheSerializableFactory).to.have.property('info');
    expect(huCacheSerializableFactory).to.have.property('get');

    expect(huCacheSerializableFactory.get('testCache')).to.be.equal(cache);
    expect(huCacheSerializableFactory.info()).to.have.property('testCache')
        .and.to.be.eql(cache.info());

    function dup() {
      return huCacheSerializableFactory('testCache');
    }
    expect(dup).to.throw(/huCacheSerializableFactory: CacheId .* is already taken!/);
  }));

  it('should accept capacity or maxLength', inject(function(huCacheSerializableFactory) {
    function create() {
      huCacheSerializableFactory('testCache', {
        storage: storage,
        capacity: 1,
        maxLength: 12
      });
    }
    expect(create).to.throw(/huCacheSerializableFactory: you must choose between capacity OR maxLength/);
  }));

  it('should not add undefined values', inject(function(huCacheSerializableFactory) {
    var cache = huCacheSerializableFactory('testCache', {
      storage: storage,
      capacity: 1
    });

    expect(cache.put('key')).to.not.exist;
    expect(cache.get('key')).to.not.exist;
    expect(storage._data).to.not.have.property('hucsss.testCache.i.key');
    expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
  }));

  it('should create the lru in storage on instantiation', inject(function(huCacheSerializableFactory) {
    huCacheSerializableFactory('testCache', {
      storage: storage,
      capacity: 1
    });

    expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
  }));

  it('should update the stored value when updating the cache', inject(function(huCacheSerializableFactory) {
    var cache = huCacheSerializableFactory('testCache', {
      storage: storage,
      capacity: 1
    });

    cache.put('key', 'original');
    cache.put('key', 'modified');

    $timeout.flush();
    expect(storage._data).to.have.property('hucsss.testCache.i.key', JSON.stringify('modified'));

    expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({
      key: 0
    }));
  }));

  it('should be able to use a custom serializer for parsing', inject(function(huCacheSerializableFactory) {
    storage.setItem('hucsss.testCache.i.key', JSON.stringify('value'));
    storage.setItem('hucsss.testCache.l', JSON.stringify({
      key: 0
    }));

    sandbox.spy(serializer, 'stringify');
    sandbox.spy(serializer, 'parse');

    var cache = huCacheSerializableFactory('testCache', {
      storage: storage,
      serializer: 'testSerializer'
    });

    cache.put('key2', 'value2');

    expect(serializer.parse).to.have.been.calledWith(JSON.stringify('value'));
    expect(serializer.stringify).to.have.been.calledWith('value2');

  }));

  it('should calculate the serialization only once when putting a value', inject(function(huCacheSerializableFactory) {
    var cache = huCacheSerializableFactory('testCache', {
      storage: storage,
      maxLength: 100000,
      serializer: 'testSerializer'
    });

    var spy = sandbox.spy(serializer, 'stringify');
    cache.put('key', 'value');
    $timeout.flush();
    expect(spy).to.have.been.calledOnce;
  }));


  describe('flushing max cache (w/o capacity or maxLength)', function() {
    var cache;

    beforeEach(inject(function(huCacheSerializableFactory) {
     cache = huCacheSerializableFactory('testCache', {
       storage: storage
     });
    }));

    it('should add items to storage', function() {
      cache.put('key', 'value');
      cache.put('key2', 'value2');
      expect(storage._data).to.have.property('hucsss.testCache.i.key', '"value"');
      expect(storage._data).to.have.property('hucsss.testCache.i.key2', '"value2"');
      expect(cache.get('key')).to.be.eql('value');
      expect(cache.get('key2')).to.be.eql('value2');

    });

    it('should flush LRU only once per set cycle', function() {
      cache.put('key', 'value');
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
      cache.put('key2', 'value2');
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
      $timeout.flush();
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({
        key2: 0,
        key: 0
      }));
    });

    it('should update LRU get getting a key', function() {
      cache.put('key', 'value');
      cache.put('key2', 'value2');
      $timeout.flush();
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({
        key2: 0,
        key: 0
      }));

      cache.get('key');
      $timeout.flush();
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({
        key: 0,
        key2: 0
      }));
    });

    it('should remove items from storage', function() {
      cache.put('key', 'value');
      expect(storage._data).to.have.property('hucsss.testCache.i.key', '"value"');
      cache.remove('key');
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key');
    });

    it('should flush LRU only once per remove cycle', function() {
      cache.put('key', 'value');
      cache.put('key2', 'value2');
      cache.remove('key');
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
      expect(cache.get('key')).to.not.exist;
      $timeout.flush();
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({
        key2: 0
      }));
    });

    it('should remove all items from storage', function() {
      cache.put('key', 'value');
      cache.put('key2', 'value2');
      cache.removeAll();
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key');
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key2');
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
    });

    it('should flush LRU only once per removeAll cycle', function() {
      cache.put('key', 'value');
      cache.put('key2', 'value2');
      cache.removeAll();
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
      $timeout.flush();
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
    });

    it('should be able to destroy the cache', function() {
      cache.put('key', 'value');
      cache.destroy();
      expect(storage._data).to.not.have.property('hucsss.testCache.l');
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key');
      $timeout.verifyNoPendingTasks();
    });

    it('should be able to prune the cache', function() {
      cache.put('key', 'value');
      cache.put('key2', 'value2');
      cache.prune();
      $timeout.flush();

      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({
        key2: 0,
        key: 0
      }));
    });

    it('should not serialize promises', inject(function($q) {
      var promise = $q.when('value'); //Creating a promise in test, adds a task to the flush queue
      cache.put('key', promise);
      cache.put('key2', 'value2');
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key');

      expect(cache.get('key')).to.be.equal(promise);
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key');

      $timeout.flush();
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key');
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({
        key2: 0
      }));

      cache.remove('key');
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key');
      $timeout.verifyNoPendingTasks();

    }));
  });

  ////////////////////////////////////

  describe('flushing cache with capacity', function() {
    var cache;

    beforeEach(inject(function(huCacheSerializableFactory) {
      cache = huCacheSerializableFactory('testCache', {
        storage: storage,
        capacity: 1
      });
    }));

    it('should add items to storage', function() {
      cache.put('key', 'value');
      cache.put('key2', 'value2');
      expect(storage._data).not.to.have.property('hucsss.testCache.i.key');
      expect(storage._data).to.have.property('hucsss.testCache.i.key2', '"value2"');
      expect(cache.get('key')).to.not.exist;
      expect(cache.get('key2')).to.be.eql('value2');

    });

    it('should flush LRU only once per set cycle', function() {
      cache.put('key', 'value');
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
      cache.put('key2', 'value2');
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
      $timeout.flush();
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({
        key2: 0
      }));
    });

    it('should not update LRU get getting a missing key', function() {
      cache.put('key', 'value');
      cache.put('key2', 'value2');
      $timeout.flush();
      cache.get('key');
      $timeout.verifyNoPendingTasks();
    });

    it('should remove items from storage', function() {
      cache.put('key', 'value');
      expect(storage._data).to.have.property('hucsss.testCache.i.key', '"value"');
      cache.remove('key');
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key');
    });

    it('should flush LRU only once per remove cycle', function() {
      cache.put('key', 'value');
      cache.remove('key');
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
      expect(cache.get('key')).to.not.exist;
      $timeout.flush();
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
    });

    it('should remove all items from storage', function() {
      cache.put('key', 'value');
      cache.put('key2', 'value2');
      cache.removeAll();
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key');
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key2');
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
    });

    it('should flush LRU only once per removeAll cycle', function() {
      cache.put('key', 'value');
      cache.put('key2', 'value2');
      cache.removeAll();
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
      $timeout.flush();
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
    });

    it('should be able to destroy the cache', function() {
      cache.put('key', 'value');
      cache.destroy();
      expect(storage._data).to.not.have.property('hucsss.testCache.l');
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key');
      $timeout.verifyNoPendingTasks();
    });

    it('should be able to prune the cache', function() {
      cache.put('key', 'value');
      cache.put('key2', 'value2');
      cache.prune();
      $timeout.flush();

      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({
        key2: 0
      }));
    });

    it('should not serialize promises', inject(function($q) {
      var promise = $q.when('value'); //Creating a promise in test, adds a task to the flush queue
      cache.put('key', promise);
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key');

      expect(cache.get('key')).to.be.equal(promise);
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key');

      $timeout.flush();
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key');
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));

      cache.remove('key');
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key');
      $timeout.verifyNoPendingTasks();

    }));
  });

  ///////////////////////////

  describe('flushing cache with maxLength', function() {
    var cache;

    beforeEach(inject(function(huCacheSerializableFactory) {
      cache = huCacheSerializableFactory('testCache', {
        storage: storage,
        maxLength: 60
      });
    }));

    it('should add items to storage', function() {
      cache.put('key', 'value');
      cache.put('key2', 'value2');
      expect(storage._data).not.to.have.property('hucsss.testCache.i.key');
      expect(storage._data).to.have.property('hucsss.testCache.i.key2', '"value2"');
      expect(cache.get('key')).to.not.exist;
      expect(cache.get('key2')).to.be.eql('value2');
    });

    it('should not add items dont fit in the cache', function() {
      cache.put('key', 'valuevaluevaluevaluevaluevaluevaluevaluevaluevaluevaluevaluevaluevaluevaluevalue' +
      'valuevaluevaluevaluevaluevaluevaluevaluevaluevaluevaluevaluevaluevaluevaluevalue');
      expect(storage._data).not.to.have.property('hucsss.testCache.i.key');
      expect(cache.get('key')).to.not.exist;
    });

    it('should flush LRU only once per set cycle', function() {
      cache.put('key', 'value');
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
      cache.put('key2', 'value2');
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
      $timeout.flush();
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({
        key2: 0
      }));
    });

    it('should not update LRU get getting a missing key', function() {
      cache.put('key', 'value');
      cache.put('key2', 'value2');
      $timeout.flush();
      cache.get('key');
      $timeout.verifyNoPendingTasks();
    });

    it('should remove items from storage', function() {
      cache.put('key', 'value');
      expect(storage._data).to.have.property('hucsss.testCache.i.key', '"value"');
      cache.remove('key');
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key');
    });

    it('should flush LRU only once per remove cycle', function() {
      cache.put('key', 'value');
      cache.remove('key');
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
      expect(cache.get('key')).to.not.exist;
      $timeout.flush();
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
    });

    it('should remove all items from storage', function() {
      cache.put('key', 'value');
      cache.put('key2', 'value2');
      cache.removeAll();
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key');
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key2');
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
    });

    it('should flush LRU only once per removeAll cycle', function() {
      cache.put('key', 'value');
      cache.put('key2', 'value2');
      cache.removeAll();
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
      $timeout.flush();
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
    });

    it('should be able to destroy the cache', function() {
      cache.put('key', 'value');
      cache.destroy();
      expect(storage._data).to.not.have.property('hucsss.testCache.l');
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key');
      $timeout.verifyNoPendingTasks();
    });

    it('should be able to prune the cache', function() {
      cache.put('key', 'value');
      cache.put('key2', 'value2');
      cache.prune();
      $timeout.flush();

      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({
        key2: 0
      }));
    });

    it('should not serialize promises', inject(function($q) {
      var promise = $q.when('value'); //Creating a promise in test, adds a task to the flush queue
      cache.put('key', promise);
      cache.put('key2', 'value2');
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key');

      expect(cache.get('key')).to.be.equal(promise);
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key');

      $timeout.flush();
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key');
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({
        key2: 0
      }));

      cache.remove('key');
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key');
      $timeout.verifyNoPendingTasks();
    }));
  });

  ////////////////////////////////////

  describe('flushing cache with maxAge', function() {
    var cache, now = new Date().getTime(), clock, maxAge = 100;

    beforeEach(inject(function(huCacheSerializableFactory) {
      clock = sandbox.useFakeTimers(now);
      cache = huCacheSerializableFactory('testCache', {
        storage: storage,
        maxAge: maxAge
      });
    }));

    it('should add items to storage', function() {
      cache.put('key', 'value');
      cache.put('key2', 'value2');
      expect(storage._data).to.have.property('hucsss.testCache.i.key', '"value"');
      expect(storage._data).to.have.property('hucsss.testCache.i.key2', '"value2"');
      expect(cache.get('key')).to.be.eql('value');
      expect(cache.get('key2')).to.be.eql('value2');

    });

    it('should flush LRU only once per set cycle', function() {
      cache.put('key', 'value');
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
      cache.put('key2', 'value2');
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
      $timeout.flush();
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({
        key2: now,
        key: now
      }));
    });

    it('should remove items from storage', function() {
      cache.put('key', 'value');
      expect(storage._data).to.have.property('hucsss.testCache.i.key', '"value"');
      cache.remove('key');
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key');
    });

    it('should flush LRU only once per remove cycle', function() {
      cache.put('key', 'value');
      cache.remove('key');
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
      expect(cache.get('key')).to.not.exist;
      $timeout.flush();
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
    });

    it('should remove items from storage when they expire', function() {
      cache.put('key', 'value');
      expect(storage._data).to.have.property('hucsss.testCache.i.key', '"value"');
      clock.tick(maxAge + 1);
      var val = cache.get('key');
      expect(val).to.not.exist;
      $timeout.flush();
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
    });

    it('should prune staled items from storage on demand', function() {
      cache.put('key', 'value');
      clock.tick(maxAge + 1);
      cache.put('key2', 'value2');
      cache.prune();
      var val = cache.get('key');
      expect(val).to.not.exist;
      $timeout.flush();
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({
        key2: now + maxAge + 1
      }));
    });

    it('should flush LRU only once per remove cycle', function() {
      cache.put('key', 'value');
      cache.remove('key');
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
      expect(cache.get('key')).to.not.exist;
      $timeout.flush();
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
    });

    it('should remove all items from storage', function() {
      cache.put('key', 'value');
      cache.put('key2', 'value2');
      cache.removeAll();
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key');
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key2');
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
    });

    it('should flush LRU only once per removeAll cycle', function() {
      cache.put('key', 'value');
      cache.put('key2', 'value2');
      cache.removeAll();
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
      $timeout.flush();
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
    });

    it('should be able to destroy the cache', function() {
      cache.put('key', 'value');
      cache.destroy();
      expect(storage._data).to.not.have.property('hucsss.testCache.l');
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key');
      $timeout.verifyNoPendingTasks();
    });


    it('should not serialize promises', inject(function($q) {
      var promise = $q.when('value'); //Creating a promise in test, adds a task to the flush queue
      cache.put('key', promise);
      cache.put('key2', 'value2');
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key');

      expect(cache.get('key')).to.be.equal(promise);
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key');

      $timeout.flush();
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key');
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({
        key2: now
      }));

      cache.remove('key');
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key');
      $timeout.verifyNoPendingTasks();

    }));
  });

  ///////////////////////

  describe('flushing cache with maxAge and maxLength', function() {
    var cache, now = new Date().getTime(), clock, maxAge = 100;

    beforeEach(inject(function(huCacheSerializableFactory) {
      clock = sandbox.useFakeTimers(now);
      cache = huCacheSerializableFactory('testCache', {
        storage: storage,
        maxAge: maxAge,
        maxLength: 102
      });
    }));

    it('should add items to storage', function() {
      cache.put('key', 'value');
      cache.put('key2', 'value2');
      expect(storage._data).to.have.property('hucsss.testCache.i.key', '"value"');
      expect(storage._data).to.have.property('hucsss.testCache.i.key2', '"value2"');
      expect(cache.get('key')).to.be.eql('value');
      expect(cache.get('key2')).to.be.eql('value2');
    });

    it('should flush LRU only once per set cycle', function() {
      cache.put('key', 'value');
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
      cache.put('key2', 'value2');
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
      $timeout.flush();
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({
        key2: now,
        key: now
      }));
    });

    it('should remove items from storage', function() {
      cache.put('key', 'value');
      expect(storage._data).to.have.property('hucsss.testCache.i.key', '"value"');
      cache.remove('key');
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key');
    });

    it('should flush LRU only once per remove cycle', function() {
      cache.put('key', 'value');
      cache.remove('key');
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
      expect(cache.get('key')).to.not.exist;
      $timeout.flush();
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
    });

    it('should remove items from storage when they expire', function() {
      cache.put('key', 'value');
      expect(storage._data).to.have.property('hucsss.testCache.i.key', '"value"');
      clock.tick(maxAge + 1);
      var val = cache.get('key');
      expect(val).to.not.exist;
      $timeout.flush();
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
    });

    it('should prune staled items from storage on demand', function() {
      cache.put('key', 'value');
      clock.tick(maxAge + 1);
      cache.put('key2', 'value2');
      cache.prune();
      var val = cache.get('key');
      expect(val).to.not.exist;
      $timeout.flush();
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({
        key2: now + maxAge + 1
      }));
    });

    it('should flush LRU only once per remove cycle', function() {
      cache.put('key', 'value');
      cache.remove('key');
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
      expect(cache.get('key')).to.not.exist;
      $timeout.flush();
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
    });

    it('should remove all items from storage', function() {
      cache.put('key', 'value');
      cache.put('key2', 'value2');
      cache.removeAll();
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key');
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key2');
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
    });

    it('should flush LRU only once per removeAll cycle', function() {
      cache.put('key', 'value');
      cache.put('key2', 'value2');
      cache.removeAll();
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
      $timeout.flush();
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
    });

    it('should be able to destroy the cache', function() {
      cache.put('key', 'value');
      cache.destroy();
      expect(storage._data).to.not.have.property('hucsss.testCache.l');
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key');
      $timeout.verifyNoPendingTasks();
    });


    it('should not serialize promises', inject(function($q) {
      var promise = $q.when('value'); //Creating a promise in test, adds a task to the flush queue
      cache.put('key', promise);
      cache.put('key2', 'value2');
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key');

      expect(cache.get('key')).to.be.equal(promise);
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key');

      $timeout.flush();
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key');
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({
        key2: now
      }));

      cache.remove('key');
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key');
      $timeout.verifyNoPendingTasks();

    }));
  });

  ////////////////////////////////////

  describe('loading caches', function() {
    var huCacheSerializableFactory;

    beforeEach(inject(function(_huCacheSerializableFactory_) {
      huCacheSerializableFactory = _huCacheSerializableFactory_;
    }));

    it('should load a cache from storage', function() {
      storage.setItem('hucsss.testCache.i.key', JSON.stringify('value'));
      storage.setItem('hucsss.testCache.i.key2', JSON.stringify('value2'));
      storage.setItem('hucsss.testCache.l', JSON.stringify({
        key2: 0,
        key: 0
      }));

      var cache = huCacheSerializableFactory('testCache', {
        storage: storage
      });
      expect(cache.get('key')).to.be.equals('value');
      expect(cache.get('key2')).to.be.equals('value2');
    });

    it('should prune with an invalid lru', function() {
      storage.setItem('hucsss.testCache.i.key', JSON.stringify('value'));
      storage.setItem('hucsss.testCache.i.key2', JSON.stringify('value2'));
      storage.setItem('hucsss.testCache.l', JSON.stringify({
        key2: 0,
        key: 0
      }) + '"');

      var cache = huCacheSerializableFactory('testCache', {
        storage: storage
      });
      expect(cache.get('key')).to.not.exist;
      expect(cache.get('key2')).to.not.exist;
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key');
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key2');
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
    });

    it('should prune with an invalid item', function() {
      storage.setItem('hucsss.testCache.i.key', JSON.stringify('value') + '"');
      storage.setItem('hucsss.testCache.i.key2', JSON.stringify('value2'));
      storage.setItem('hucsss.testCache.l', JSON.stringify({
        key2: 0,
        key: 0
      }));

      var cache = huCacheSerializableFactory('testCache', {
        storage: storage
      });
      expect(cache.get('key')).to.not.exist;
      expect(cache.get('key2')).to.exist;
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key');
      expect(storage._data).to.have.property('hucsss.testCache.i.key2', '"value2"');
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({
        key2: 0
      }));
    });

    it('should prune with missing items', function() {
      storage.setItem('hucsss.testCache.i.key2', JSON.stringify('value2'));
      storage.setItem('hucsss.testCache.l', JSON.stringify({
        key2: 0,
        key: 0
      }));

      var cache = huCacheSerializableFactory('testCache', {
        storage: storage
      });
      expect(cache.get('key')).to.not.exist;
      expect(cache.get('key2')).to.exist;
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key');
      expect(storage._data).to.have.property('hucsss.testCache.i.key2', '"value2"');
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({
        key2: 0
      }));
    });

    it('should prune with missing lru', function() {
      storage.setItem('hucsss.testCache.i.key', JSON.stringify('value'));
      storage.setItem('hucsss.testCache.i.key2', JSON.stringify('value2'));

      var cache = huCacheSerializableFactory('testCache', {
        storage: storage
      });
      expect(cache.get('key')).to.not.exist;
      expect(cache.get('key2')).to.not.exist;
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key');
      expect(storage._data).to.not.have.property('hucsss.testCache.i.key2');
      expect(storage._data).to.have.property('hucsss.testCache.l', JSON.stringify({}));
    });

    it('should use the stored length when loading cache', function() {
      storage.setItem('hucsss.testCache.i.key', JSON.stringify('value'));
      storage.setItem('hucsss.testCache.l', JSON.stringify({
        key: 0
      }));

      sandbox.spy(serializer, 'stringify');

      huCacheSerializableFactory('testCache', {
        storage: storage,
        maxLength: 100000,
        serializer: 'testSerializer'
      });

      expect(serializer.stringify).to.not.have.been.called;

    });
  });

  describe('full storage', function() {
    it('should prune the cache and try again', inject(function(huCacheSerializableFactory) {

      var now = new Date().getTime(), clock, maxAge = 100;

      clock = sandbox.useFakeTimers(now);
      var cache = huCacheSerializableFactory('testCache', {
        storage: storage,
        maxAge: 100
      });

      sandbox.stub(storage, 'setItem')
          .onFirstCall().returns()//puts key
          .onSecondCall().throws();//fails putting key2 -> Causes prune
      sandbox.spy(storage, 'removeItem');

      cache.put('key', 'value');
      clock.tick(maxAge + 1);
      cache.put('key2', 'value2');

      expect(cache.get('key')).to.not.exist;
      expect(cache.get('key2')).to.exist;
      $timeout.flush();
      expect(storage.removeItem).to.have.been.calledWith('hucsss.testCache.i.key');
      expect(storage.setItem).to.have.been.calledWith('hucsss.testCache.l', JSON.stringify({
        key2: now + maxAge + 1
      }));
    }));

    it('should drop least used item when storage is full after pruning it', inject(function(huCacheSerializableFactory) {
      var cache = huCacheSerializableFactory('testCache', {
        storage: storage
      });

      sandbox.stub(storage, 'setItem')
          .onCall(0).returns()//puts key
          .onCall(1).returns()//puts key2
          .onCall(2).throws()//fails putting key3 -> Causes prune
          .onCall(3).throws()//fails putting key3 -> Causes remove of least used key
          .onCall(4).throws();//fails putting key3 -> Causes remove of least used key2

      sandbox.spy(storage, 'removeItem');

      cache.put('key', 'value');
      cache.put('key2', 'value2');
      cache.put('key3', 'value3');
      $timeout.flush();

      expect(cache.get('key')).to.exist;
      expect(cache.get('key2')).to.exist;
      expect(cache.get('key3')).to.exist;

      expect(storage.removeItem).to.have.been.calledWith('hucsss.testCache.i.key');
      expect(storage.removeItem).to.have.been.calledWith('hucsss.testCache.i.key2');
      expect(storage.removeItem).to.not.have.been.calledWith('hucsss.testCache.i.key3');
      expect(storage.setItem).to.have.been.calledWith('hucsss.testCache.l', JSON.stringify({
        key3: 0,
        key2: 0,
        key: 0
      }));
    }));

    it('should prune the cache and try again when fails writting LRU', inject(function(huCacheSerializableFactory) {

      var now = new Date().getTime(), clock, maxAge = 100;

      clock = sandbox.useFakeTimers(now);
      var cache = huCacheSerializableFactory('testCache', {
        storage: storage,
        maxAge: 100
      });

      cache.put('key', 'value');
      clock.tick(maxAge + 1);
      cache.put('key2', 'value2');

      sandbox.stub(storage, 'setItem')
          .onFirstCall().throws();
      sandbox.spy(storage, 'removeItem');

      $timeout.flush();
      expect(storage.removeItem).to.have.been.calledWith('hucsss.testCache.i.key');
      expect(storage.setItem).to.have.been.calledWith('hucsss.testCache.l', JSON.stringify({
        key2: now + maxAge + 1
      }));
    }));

    it('should drop least used item when storage is full after pruning it ' +
      'when fails writting LRU', inject(function(huCacheSerializableFactory) {
      var cache = huCacheSerializableFactory('testCache', {
        storage: storage
      });

      sandbox.spy(storage, 'removeItem');

      cache.put('key', 'value');
      cache.put('key2', 'value2');

      sandbox.stub(storage, 'setItem')
          .onFirstCall().throws()//puts lru
          .onSecondCall().throws();//fails putting key2 -> Causes prune

      $timeout.flush();

      expect(storage.removeItem).to.have.been.calledWith('hucsss.testCache.i.key');
      expect(storage.setItem).to.have.been.calledWith('hucsss.testCache.l', JSON.stringify({
        key2: 0,
        key: 0
      }));
    }));

  });
});
