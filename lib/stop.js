var fs = require('fs');
var util = require('util');
var async = require('async');
var _ = require('underscore');
var common = require('./common');
var path = require('./path');

function bashStop(next) {
}

function foreverStop(next) {
}

exports.stopMap = {
  'bash': bashStop,
  'forever': foreverStop
};

exports.stop = function(pkgPath) {
  common.readNinConf(pkgPath, function(err, conf) {
    if (err) {
      throw err;
      return;
    }
    // yes, we actually look into conf.start for the stop command
    if (conf.start) {
      if (!_.isArray(conf.start)) {
        conf.start = [ conf.start ];
      }
      var oldcwd = process.cwd();
      common.out.info(util.format('entering dir: %s.', pkgPath));
      process.chdir(pkgPath);
      var tasks = [];
      conf.start.forEach(function(act, index) {
        tasks.push(function(next) {
          if (act.type && exports.stopMap[act.type]) {
            common.out.info(util.format('stop (%d) action: %j.', index, act));
            exports.stopMap[act.type](next);
          }
        });
        async.series(tasks, function(err) {
          common.out.info(util.format('leaving dir: %s.', pkgPath));
          if (err) {
            throw err;
            return;
          }
        });
      });
    }
  });
};

exports.register = function(program) {
  var c =
    program
      .command('stop <pkgname>')
      .description(common.formatDescription(['Stop your app.',
        '<pkgname> is the pkg installed dir name, i.e., some name in <cwd>/node_modules/']));

    c.action(function(pkgname) {
      common.setupGlobalOptions(program);
      var p = path.resolve(process.cwd(), 'node_modules/' + pkgname);
      if (fs.existsSync(p)) {
        try {
          exports.stop(p);
        } catch(err) {
          process.exit(1);
        }
      } else {
        common.out.error(util.format('Pkg %s not found at %s.', pkgname, p));
        process.exit(1);
      }
    });
};
