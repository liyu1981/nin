var async = require('async');
var util = require('util');
var path = require('path');
var fs = require('fs');
var common = require('./common');

function recursiveDelete(path) {
  if(fs.existsSync(path)) {
    if(fs.lstatSync(path).isDirectory()) {
      fs.readdirSync(path).forEach(function(file) {
        recursiveDelete(path.resolve(path, file));
      });
      fs.rmdirSync(path);
    } else {
      fs.unlinkSync(path);
    }
  } else {
    // not exist, may be symlink, just unlink it
    fs.unlinkSync(path);
  }
}

function removeSupportDirAndLinks(pkgName, callback) {
  function _getDeleteFunc(path) {
    return function(next) {
      common.out.info(util.format('delete: %s.', path));
      try {
        recursiveDelete(path);
        next();
      } catch(err) {
        next(err);
      }
    };
  }

  var pcwd = process.cwd();

  var cwdAppsPkg = path.resolve(pcwd, util.format('apps/%s', pkgName));
  var cwdEtcPkg = path.resolve(pcwd, util.format('etc/%s', pkgName));
  var cwdVarPkg = path.resolve(pcwd, util.format('var/%s', pkgName));
  var cwdLogPkg = path.resolve(pcwd, util.format('log/%s', pkgName));

  console.log('will remove support:', cwdAppsPkg);
  async.series([
    _getDeleteFunc(cwdAppsPkg),
    _getDeleteFunc(cwdEtcPkg),
    _getDeleteFunc(cwdVarPkg),
    _getDeleteFunc(cwdLogPkg)
  ], callback);
}

exports.remove = function(pkgName, next) {
  var npm = require('npm');
  npm.load(function(err, npm) {
    if (err) { return next(err); };
    common.out.info(util.format('now uninstall pkg: %s.', pkgName));
    npm.commands.uninstall([pkgName], function(err, result) {
      if (err) {
        common.out.error(util.format('uninstallation of pkg %s failed: %j.', pkgName, err));
        return next(err);
      }
      common.out.info('pkg %s uninstalled.', pkgName);
      if (exports.cmdOpts.keep) {
        common.out.info('remove support dir and links of %s skipped.', pkgName);
        next(null);
      } else {
        common.out.info('now remove support dir and links of %s.', pkgName);
        removeSupportDirAndLinks(pkgName, function(err) {
          if (err) {
            common.out.error(util.format('remove support dir and links for %s failed: %j.', pkgName, err));
            return next(err);
          }
          next(null);
        });
      }
    });
  });
};

exports.cmdOpts = null;

function setupOptions(command) {
  // simple ref the command instance
  exports.cmdOpts = command;
}

exports.register = function(program) {
  var c =
    program
      .command('remove <pkgname>')
      .option('-k, --keep', 'keep old user data')
      .description(common.formatDescription(['Remove your app.',
        '<pkgname> is the pkg installed dir name, i.e., some name in <cwd>/apps/']));

  c.action(function(pkgname) {
    common.setupGlobalOptions(program);
    setupOptions(c);
    var p = path.resolve(process.cwd(), 'node_modules/' + pkgname);
    try {
      if (fs.existsSync(p)) {
        common.out.info(util.format('now remove: %s.', pkgname));
        exports.remove(pkgname, common.throwOutOrExit);
      } else {
        common.out.info('Can not find pkg %s, skip.', pkgname);
        process.exit(1);
      }
    } catch(err) {
      common.out.error(err);
      process.exit(1);
    }
  });
};
