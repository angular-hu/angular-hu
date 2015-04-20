/**
 * local storage dummy mock
 */

function createLocalStorageMock() {
  var data = {};

  var mock = {
    setItem: function(id, val) {
      data[id] = String(val);
    },
    getItem: function(id) {
      return data.hasOwnProperty(id) ? data[id] : null;
    },
    removeItem: function(id) {
      delete data[id];
    },
    clear: function() {
      data = {};
    },
    key: function(index) {
      return Object.keys(data)[index];
    }
  };

  Object.defineProperty(mock, 'length', {
    get: function() {
      return Object.keys(data).length;
    },
    enumerable: false
  });
  Object.defineProperty(mock, '_data', {
    get: function() {
      return data;
    },
    enumerable: false
  });

  return mock;
}