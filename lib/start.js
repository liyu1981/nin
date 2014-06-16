var fs = require('fs');
var util = require('util');
var async = require('async');
var _ = require('underscore');
var common = require('./common');
var path = require('./path');

/* bashStart
   start app with the cmd line specified in content
   output the pid into <pkgPath>/var
 */
function bashStart(content, next) {
}

/* foreverStart
   start app through forever with the index script specified in content
   output the pid into <pkgPath>/var
 */
function foreverStart(content, next) {
}

exports.startMap = {
  'bash': bashStart,
  'forever': foreverStart
};

exports.start = function(pkgPath) {
  common.readNinConf(pkgPath, function(err, conf) {
    if (err) {
      throw err;
      return;
    }
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
          if (act.type && act.content && exports.startMap[act.type]) {
            common.out.info(util.format('execute (%d) action: %j.', index, act));
            exports.startMap[act.type](act.content, next);
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
      .command('start <pkgname>')
      .description(common.formatDescription(['Start your app.',
        '<pkgname> is the pkg installed dir name, i.e., some name in <cwd>/node_modules/',
        'pid file will write to var/<pkgname>']));

  c.action(function(pkgname) {
    common.setupGlobalOptions(program);
    var p = path.resolve(process.cwd(), 'node_modules/' + pkgname);
    if (fs.existsSync(p)) {
      try {
        exports.start(p);
      } catch(err) {
        process.exit(1);
      }
    } else {
      common.out.error(util.format('Pkg %s not found at %s.', pkgname, p));
      process.exit(1);
    }
  });
};
