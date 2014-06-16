var util = require('util');
var path = require('path');
var fs = require('fs');
var async = require('async');
var _ = require('underscore');
var util = require('util');
var common = require('./common');

function ensureDir(dir, mode, callback) {
  mode = mode || 0777 & (~process.umask());
  callback = callback || function () {};
  fs.exists(dir, function (exists) {
    if (exists) { return callback(null); }
    var current = path.resolve(dir), parent = path.dirname(current);
    ensureDir(parent, mode, function (err) {
      if (err) { return callback(err); }
      fs.mkdir(current, mode, function (err) {
        if (err && err.code != 'EEXIST') { return callback(err); } // avoid the error under concurrency
        callback(null);
      });
    });
  });
}

function ensureSupportDirs(pkgPath, callback) {
  function _getEnsureDirFunc(pkgPath) {
    return function(next) {
      common.out.info(util.format('Ensure dir: %s', pkgPath));
      ensureDir(pkgPath, null, next);
    };
  }
  function _getEnsureLinkFunc(from, to) {
    return function(next) {
      common.out.info(util.format('Ensure link: %s -> %s', from, to));
      fs.symlink(from, to, next);
    };
  }
  var pcwd = process.cwd();
  var pkgName = path.basename(pkgPath);
  var cwdEtc = path.resolve(pcwd, 'etc');
  var pkgEtc = path.resolve(pcwd, util.format('%s/etc', pkgPath));
  var pkgVar = path.resolve(pcwd, util.format('%s/var', pkgPath));
  var pkgLog = path.resolve(pcwd, util.format('%s/log', pkgPath));
  var cwdEtcPkg = path.resolve(pcwd, util.format('etc/%s', pkgName));
  var cwdVarPkg = path.resolve(pcwd, util.format('var/%s', pkgName));
  var cwdLogPkg = path.resolve(pcwd, util.format('log/%s', pkgName));
  async.series([
    _getEnsureDirFunc(cwdEtc),
    _getEnsureDirFunc(pkgEtc),
    _getEnsureDirFunc(cwdVarPkg),
    _getEnsureDirFunc(cwdLogPkg),
    _getEnsureLinkFunc(pkgEtc, cwdEtcPkg),
    _getEnsureLinkFunc(cwdLogPkg, pkgLog),
    _getEnsureLinkFunc(cwdVarPkg, pkgVar)
  ], callback);
}

exports.deploy = function(pkg) {
  var npm = require('npm');
  npm.load(function (err, npm) {
    if (err) {
      throw new Error(util.format('Loading npm failed: %j.', err));
      return;
    }
    common.out.info(util.format('Now install pkg: %s.', pkg));
    npm.commands.install([pkg], function(err, result) {
      if (err) {
        common.out.error(util.format('Installation of pkg %s failed: %j.', pkg, err));
        throw err;
        return;
      }
      var pkginfo = _.last(result);
      common.out.info(util.format('%s was installed to %s.', pkginfo[0], pkginfo[1]));
      ensureSupportDirs(pkginfo[1], function(err) {
        if (err) {
          throw new Error(util.format('Ensuring support dirs for %s failed: %j.', pkg, err));
          return;
        }
        require('./setup').setup(require('path').resolve(process.cwd(), pkginfo[1]));
      });
    });
  });
};

exports.register = function(program) {
  var c =
    program
      .command('deploy <pkg>')
      .description(common.formatDescription(['Install your app.',
        '<pkg> can be any llegal npm pkg names.',
        'Ref https://www.npmjs.org/doc/cli/npm-install.html']));

  c.action(function(pkg) {
    common.setupGlobalOptions(program);
    try {
      exports.deploy(pkg);
    } catch(err) {
      process.exit(1);
    }
  });
};
