var fs = require('fs');
var util = require('util');
var path = require('path');
var async = require('async');
var _ = require('underscore');
var common = require('./common');

function bashStop(content, next) {
  var bashPath = path.resolve(process.cwd(), content);
  var options = {
    env: common.getNinEnvForChildProcess(),
    cwd: process.cwd(),
    detached: true
  };
  //console.log(options);
  common.spawnCmd('bash', [ bashPath ], options,
    function _streamToConsole(child) {
      child.stdout.on('data', function(buffer) { process.stdout.write(buffer.toString()); });
      child.stderr.on('data', function(buffer) { process.stderr.write(buffer.toString()); });
      child.on('exit', function(code) {
        if (code === 0) {
          next(null);
        } else {
          next(new Error(util.format('execution of %s failed: %d.', bashPath, code)));
        }
      });
      child.unref();
    });
}

function foreverStop(content, next) {
  require('forever')
    .stop(path.resolve(process.cwd(), content))
    .on('stop', function() {
      common.out.info(util.format('app stoped: %s.', content));
      next(null);
    })
    .on('error', function(err) {
      next(err);
    });
}

exports.stopMap = {
  'bash': bashStop,
  'forever': foreverStop
};

exports.stop = function(pkgPath, next) {
  common.readNinConf(pkgPath, function(err, conf) {
    if (err) { return next(err); }
    if (conf.stop) {
      if (!_.isArray(conf.stop)) {
        conf.start = [ conf.stop ];
      }
      var oldcwd = process.cwd();
      common.out.info(util.format('entering dir: %s.', pkgPath));
      process.chdir(pkgPath);
      var tasks = [];
      conf.stop.forEach(function(act, index) {
        tasks.push(function(next) {
          if (act.type && exports.stopMap[act.type]) {
            common.out.info(util.format('stop (%d) action: %j.', index, act));
            exports.stopMap[act.type](act.content, next);
          }
        });
        async.series(tasks, function(err) {
          common.out.info(util.format('leaving dir: %s.', pkgPath));
          process.chdir(oldcwd);
          if (err) { return next(err); }
          common.out.info('all stoped.');
          next();
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
          exports.stop(p, common.throwOutOrExit);
        } catch(err) {
          process.exit(1);
        }
      } else {
        common.out.error(util.format('Pkg %s not found at %s.', pkgname, p));
        process.exit(1);
      }
    });
};
