var util = require('util');
var path = require('path');
var fs = require('fs');
var async = require('async');
var common = require('./common');

exports.update = function(pkgName, next) {
  var npm = require('npm');
  common.readRegistry(function(err, reg) {
    if (err) {
      common.out.error('can not open the nin-registry.');
      return next(err);
    }
    if (!reg.apps[pkgName]) {
      common.out.error(util.format('can not find the item in nin-registry for pkg: %s', pkgName));
      return next(err);
    }
    npm.load(function(err, npm) {
      if (err) { return next(err); }
      common.out.info(util.format('now update pkg: %s.', pkgName));
      // yes, we actually use npm install instead of update
      npm.commands.install([reg.apps[pkgName]], function(err, result) {
        if (err) {
          common.out.error(util.format('updating pkg %s failed: %j.', pkgName, err));
          return next(err);
        }
        common.out.info(util.format('updated pkg %s.', pkgName));
        next();
      });
    });
  });
};

exports.register = function(program) {
  var c =
    program
      .command('update [pkgname]')
      .description(common.formatDescription(['Update your app.',
        '<pkgname> is the pkg installed dir name, i.e., some name in <cwd>/apps/',
        'or leave it blank to update all pkgs in <cwd>/apps/']));

  c.action(function(pkgname) {
    common.setupGlobalOptions(program);
    function updateOnePkg(pkgname, next) {
      common.out.info(util.format('update: %s.', pkgname));
      try {
        var p = path.resolve(process.cwd(), 'node_modules/' + pkgname);
        if (fs.existsSync(p)) {
          exports.update(pkgname, next);
        } else {
          common.out.error(util.format('can not found pkg %s, skipped.', pkgname));
          next();
        }
      } catch(err) {
        common.out.error(err);
        next(err);
      }
    }
    var pkgs = null;
    if (pkgname) {
      pkgs = [ pkgname ];
    } else {
      pkgs = fs.readdirSync(path.resolve(process.cwd(), 'apps'));
    }
    common.out.info(util.format('will update: %j.', pkgs));
    async.eachSeries(pkgs, updateOnePkg, function(err) {
      process.exit(1);
    });
  });
};
