var convict = require('convict'),
  path = require('path');

var rootPath = path.join(__dirname, '/../../');

/// SCRIPT CONFIGURATION
var conf = convict({
  src: {
    doc: 'The sources directory',
    default: path.join(rootPath, 'src'),
    format: String,
    env: 'SRC_DIR',
    arg: 'src'
  },
  build: {
    doc: 'The build directory',
    default: path.join(rootPath, 'build'),
    format: String,
    env: 'BUILD_DIR',
    arg: 'build'
  },
  host: {
    doc: 'The github Host',
    default: 'github.com',
    format: String,
    env: 'PUBLISH_HOST',
    arg: 'host'
  },
  owner: {
    doc: 'The github owner for the published repos',
    default: 'angular-hu',
    format: String,
    env: 'PUBLISH_OWNER',
    arg: 'owner'
  }
});

try {
  conf.loadFile('.snaprc');
} catch (err) {}

module.exports = conf;
