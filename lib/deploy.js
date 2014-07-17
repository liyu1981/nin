var util = require('util');
var path = require('path');
var fs = require('fs');
var async = require('async');
var _ = require('underscore');
var common = require('./common');

exports.utils = {};

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

exports.utils.ensureDir = ensureDir;

function ensureSupportDirs(pkgPath, callback) {
  function _getEnsureDirFunc(pkgPath) {
    return function(next) {
      common.out.info(util.format('ensure dir: %s.', pkgPath));
      ensureDir(pkgPath, null, next);
    };
  }

  function _getEnsureLinkFunc(from, to) {
    return function(next) {
      common.out.info(util.format('ensure link: %s -> %s.', from, to));
      fs.symlink(from, to,  function(err) {
        // tolarent link error, just warning about that
        if (err) {
          common.out.warning(util.format('%j', err));
        }
        next();
      });
    };
  }

  var pcwd = process.cwd();
  var pkgName = path.basename(pkgPath);

  var cwdEtc = path.resolve(pcwd, 'etc');
  var cwdApps = path.resolve(pcwd, 'apps');
  var cwdAppsPkg = path.resolve(pcwd, util.format('apps/%s', pkgName));
  var cwdEtcPkg = path.resolve(pcwd, util.format('etc/%s', pkgName));
  var cwdVarPkg = path.resolve(pcwd, util.format('var/%s', pkgName));
  var cwdLogPkg = path.resolve(pcwd, util.format('log/%s', pkgName));

  var pkg = path.resolve(pcwd, pkgPath);
  var pkgEtc = path.resolve(pcwd, util.format('%s/etc', pkgPath));
  var pkgVar = path.resolve(pcwd, util.format('%s/var', pkgPath));
  var pkgLog = path.resolve(pcwd, util.format('%s/log', pkgPath));

  async.series([
    _getEnsureDirFunc(cwdEtc),
    _getEnsureDirFunc(cwdApps),
    _getEnsureDirFunc(cwdVarPkg),
    _getEnsureDirFunc(cwdLogPkg),
    _getEnsureDirFunc(pkgEtc),

    _getEnsureLinkFunc(pkg, cwdAppsPkg),
    _getEnsureLinkFunc(pkgEtc, cwdEtcPkg),
    _getEnsureLinkFunc(cwdLogPkg, pkgLog),
    _getEnsureLinkFunc(cwdVarPkg, pkgVar)
  ], callback);
}

exports.deploy = function(pkg, next) {
  var npm = require('npm');
  npm.load(function (err, npm) {
    if (err) { return next(err); }
    common.out.info(util.format('now install pkg: %s.', pkg));
    npm.commands.install([pkg], function(err, result) {
      if (err) {
        common.out.error(util.format('installation of pkg %s failed: %j.', pkg, err));
        return next(err);
      }
      var pkginfo = _.last(result);
      common.out.info(util.format('%s was installed to %s.', pkginfo[0], pkginfo[1]));
      ensureSupportDirs(pkginfo[1], function(err) {
        if (err) {
          common.out.error(util.format('ensuring support dirs for %s failed: %j.', pkg, err));
          return next(err);
        }
        next(null, pkginfo[1]);
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
      exports.deploy(pkg, common.throwOutOrExit);
    } catch(err) {
      common.out.error(err);
      process.exit(1);
    }
  });
};
