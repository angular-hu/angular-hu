// Karma configuration

var shared = require('./karma-shared.conf');

module.exports = function(config) {
  shared(config);

  config.set({
    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,
    // Continuous Integration mode
    // if true, it capture browsers, run tests and exit
    singleRun: true,

    browsers: ['PhantomJS'],

    reporters: ['coverage', 'coveralls'],

    coverageReporter: {
      type: 'lcov', // lcov or lcovonly are required for generating lcov.info files
      dir: 'coverage/'
    }

  });
};
