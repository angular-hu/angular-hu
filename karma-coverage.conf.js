// Karma configuration

var single = require('./karma-single.conf');

module.exports = function(config) {
  single(config);

  config.set({
    // coverage reporter generates the coverage
    reporters: ['progress', 'coverage'],

    preprocessors: {
      // source files, that you wanna generate coverage for
      // do not include tests or libraries
      // (these files will be instrumented by Istanbul)
      'src/**/*.js': ['coverage']
    },

    browsers: ['Chrome'],

    // optionally, configure the reporter
    coverageReporter: {
      type: 'html',
      dir: 'coverage/'
    }
  });
};
