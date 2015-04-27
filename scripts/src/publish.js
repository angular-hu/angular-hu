
var config = require('./config'),
  shelljs = require('shelljs'),
  Promise = require('bluebird'),
  fse = Promise.promisifyAll(require('fs-extra')),
  git = require('gitftw'),
  path = require('path');

var CLONE_DIRECTORY_BASE = 'tmp/git-clone';

initGit();

module.exports = function(conf) {
  config.load(conf || {}).validate();

  return {
    bower: bower,
    cdn: cdn
  };
};

function cdn() {
  return Promise.resolve()
    .then(function() {
      return getModules();
    })
    .map(function(module) {
      //Until we have cdnjs, we publish to github pages :)
      return publishCDNGHPages(module);
    }, {concurrency: 1});
}

function bower() {
  return Promise.resolve()
    .then(function() {
      return getModules();
    })
    .map(function(module) {
      return publishModule(module);
    }, {concurrency: 1});
}

function publishCDNGHPages(module) {
  console.error('Publishing %s to github pages (as CDN)', module);
  var dir = path.join(CLONE_DIRECTORY_BASE, module);
  return Promise.using(tempDirectory(dir), function(cloneDir) {
    return Promise.resolve()
      .then(function() {
        return cloneRepoForModule(module, cloneDir, 'gh-pages');
      })
      .then(function() {
        return copyModuleFilesToCDNRepo(module, cloneDir);
      })
      .then(function(finalDir) {
        return pushVersion(finalDir);
      });
  }).return(module);
}

function publishModule(module) {
  console.error('Publishing %s to bower', module);
  var dir = path.join(CLONE_DIRECTORY_BASE, module);
  return Promise.using(tempDirectory(dir), function(cloneDir) {
    return Promise.resolve()
      .then(function() {
        return cloneRepoForModule(module, cloneDir, 'master');
      })
      .then(function() {
        return copyModuleFilesToRepo(module, cloneDir);
      })
      .then(function() {
        return pushVersion(cloneDir);
      })
      .then(function(version) {
        return tagVersion(version, cloneDir);
      });
  }).return(module);
}

function copyModuleFilesToRepo(module, destinationDir) {
  var sourceDir = path.join(config.get('build'), module);
  return fse.copyAsync(sourceDir, destinationDir);
}

function copyModuleFilesToCDNRepo(module, destinationDir) {
  var sourceDir = path.join(config.get('build'), module);
  return Promise.using(executionDirectory(sourceDir), function() {
      return getBowerVersion();
    })
    .then(function(version) {
      return path.join(shelljs.pwd(), destinationDir, 'dist', version);
    })
    .then(function(finalDir) {
      return fse.copyAsync(sourceDir, finalDir)
        .return(finalDir);
    });
}

function pushVersion(directory) {
  return Promise.using(executionDirectory(directory), function() {
    return Promise.resolve()
      .then(function() {
        return getBowerVersion();
      })
      .then(function(version) {
        return commitAndPush(version)
          .return(version);
      });
  });
}

function tagVersion(version, directory) {
  var tag = 'v' + version;
  return Promise.using(executionDirectory(directory), function() {
    return Promise.resolve()
    .then(function() {
      return git.tag({
        tag: tag,
        annotated: true,
        message: 'Release v' + version
      });
    })
    .then(function() {
      return git.push({
        tag: tag
      });
    });
  });
}

function commitAndPush(version) {
  return Promise.resolve()
    .then(function() {
      return git.add({
        files: ['.']
      });
    })
    .then(function() {
      return git.commit({
        message: 'Release v' + version
      });
    })
    .then(function() {
      return git.push({});
    });
}

function getBowerVersion() {
  return fse.readJsonAsync('./bower.json')
    .then(function(packageObj) {
      return packageObj.version;
    });
}

function cloneRepoForModule(module, cloneDir, branch) {
  var repo = 'git@' + config.get('host') + ':' + config.get('owner') + '/bower-' + module + '.git';
  return git.clone({
    repository: repo,
    directory: cloneDir,
    branch: branch,
    depth: 1
  });
}

function getModules() {
  return fse.readdirAsync(config.get('build'))
    .catch(function(err) {
      if (err && err.code === 'ENOENT') {
        return Promise.reject(new Error(config.get('build') + ' does not exists. ' +
        'You have to build the project first'));
      }
      return Promise.reject(err);
    });
}

function executionDirectory(directory) {
  shelljs.pushd(directory);
  return Promise.resolve().disposer(function() {
    shelljs.popd();
  });
}

function tempDirectory(directory) {
  return cleanDirectory(directory).disposer(cleanDirectory.bind(null, directory));
}

function cleanDirectory(directory) {
  return fse.removeAsync(directory)
    .return(directory);
}

function initGit() {
//Add a listener to the issued git command. Output it
  git.events.on('command', console.error);

//Add a listener to the result of the git command. Output it with >
  git.events.on('result', function(res) {
    console.error('> ' + res.split('\n').join('\n> '))
  });
}
