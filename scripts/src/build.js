
var config = require('./config'),
  shelljs = require('shelljs'),
  Promise = require('bluebird'),
  fse = Promise.promisifyAll(require('fs-extra')),
  path = require('path'),
  mustache = require('mustache'),
  UglifyJS = require('uglify-js');

var STATIC_FILES = ['LICENSE'];

var rootPath = path.join(__dirname , '/../../');

module.exports = function(conf) {
  config.load(conf || {}).validate();
  return build();
};

function build() {
  return Promise.resolve()
    .then(function() {
      return cleanDirectory(config.get('build'));
    })
    .then(function() {
      return getModules();
    })
    .map(function(module) {
      return buildModule(module);
    });
}

function buildModule(module) {
  var destPath = path.join(config.get('build'), module),
      srcPath = path.join(config.get('src'), module);

  console.error('Building %s', module);
  return Promise.resolve()
    .then(function() {
      //Copy src files
      return fse.copyAsync(srcPath, destPath);
    })
    .then(function() {
      //Make bower.json
      return Promise.join(
          fse.readFileAsync(path.join(destPath, 'bower.tpl.json'), {encoding: 'utf8'}),
          fse.readJsonAsync(path.join(rootPath, 'bower.json')),
          function(tpl, bower) {
            return mustache.render(tpl, bower);
          }
        )
        .then(function(bowerStr) {
          return fse.writeFileAsync(path.join(destPath, 'bower.json'), bowerStr);
        })
        .then(function() {
          return fse.unlinkAsync(path.join(destPath, 'bower.tpl.json'));
        });
    })
    .then(function() {
      //Add header to file
      return Promise.join(
        fse.readFileAsync(path.join(__dirname, '../', 'assets', 'header.tpl.js'), {encoding: 'utf8'}),
        fse.readFileAsync(path.join(destPath, module + '.js'), {encoding: 'utf8'}),
        fse.readJsonAsync(path.join(destPath, 'bower.json')),
        function(tpl, content, bower) {
          bower.year = (new Date()).getFullYear();
          var data = mustache.render(tpl, bower) + content;
          return fse.writeFileAsync(path.join(destPath, module + '.js'), data);
        }
      );
    })
    .then(function() {
      //Add bower info to README
      //TODO: dont copy paste code
      return Promise.join(
        fse.readFileAsync(path.join(__dirname, '../', 'assets', 'README-header.tpl.md'), {encoding: 'utf8'}),
        fse.readFileAsync(path.join(__dirname, '../', 'assets', 'README-footer.tpl.md'), {encoding: 'utf8'}),
        fse.readFileAsync(path.join(destPath, 'README.md'), {encoding: 'utf8'}),
        fse.readJsonAsync(path.join(destPath, 'bower.json')),
        function(tplHeader, tplFooter, content, bower) {
          bower.year = (new Date()).getFullYear();
          var data = mustache.render(tplHeader, bower) + content + mustache.render(tplFooter, bower);
          return fse.writeFileAsync(path.join(destPath, 'README.md'), data);
        }
      );
    })
    .then(function() {
      //minify
      var result = UglifyJS.minify(path.join(destPath, module + '.js'), {
        outSourceMap: module + '.min.js.map',
        output: {
          comments: function(node, comment) {
            return comment.type === 'comment2' && /@preserve|@license|@cc_on/i.test(comment.value);
          }
        }
      });
      var sourceMap = JSON.parse(result.map);
      sourceMap.sources = sourceMap.sources.map(function(file) {
        return file.replace(destPath + path.sep, '');
      });
      sourceMap.file = sourceMap.file.replace('.map', '');
      result.map = JSON.stringify(sourceMap);
      return Promise.all([
        fse.writeFileAsync(path.join(destPath, module + '.min.js'), result.code),
        fse.writeFileAsync(path.join(destPath, module + '.min.js.map'), result.map)
      ]);
    })
    .then(function() {
      //copy static files
      return Promise
        .map(STATIC_FILES, function(file) {
          var sourceFile = path.join(rootPath, file),
              destFile = path.join(destPath, file);
          return fse.copyAsync(sourceFile, destFile);
        })
        .return();
    })
    .return(module);
}

function getModules() {
  var sourceDir = config.get('src');
  return fse.readdirAsync(sourceDir)
    .filter(function(file) {
      var p = path.join(sourceDir, file);
      return fse.lstatSync(p).isDirectory();
    });
}

function cleanDirectory(directory) {
  return fse.removeAsync(directory)
    .return(directory);
}
