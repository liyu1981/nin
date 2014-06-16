var fs = require('fs');
var util = require('util');
var async = require('async');
var _ = require('underscore');
var path = require('path');
var common = require('./common');

/* bashStart
   start app with the cmd line specified in content
 */
function bashStart(content, next) {
  var bashPath = path.resolve(process.cwd(), content);
  var options = {
    env: common.getNinEnvForChildProcess(),
    detached: true
  };
  //console.log(options);
  common.spawnCmd('bash', [ bashPath ], options,
    function(child) {
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

/* foreverStart
   start app through forever with the index script specified in content
 */
function foreverStart(content, next) {
  var cont = content;
  if (_.isString(content)) {
    cont = { script: content, options: {} };
  }
  cont.options = _.defaults(cont.options, {
    max: 3,
    pidFile: path.resolve(process.cwd(), 'var/' + cont.script + '.pid'),
    logFile: path.resolve(process.cwd(), 'var/' + cont.script + '.log'),
    outFile: path.resolve(process.cwd(), 'var/' + cont.script + '.out'),
    errFile: path.resolve(process.cwd(), 'var/' + cont.script + '.err')
  });
  require('forever')
    .start(path.resolve(process.cwd(), cont.script), cont.options)
    .on('start', function() {
      common.out.info(util.format('app started: pid %d.', child.pid));
      next(null);
    })
    .on('exit', function() {
      next(new Error(util.format('starting app failed %d times.', cont.max)));
    });
}

exports.startMap = {
  'bash': bashStart,
  'forever': foreverStart
};

exports.start = function(pkgPath) {
  common.readNinConf(pkgPath, function(err, conf) {
    if (err) { throw err; return; }
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
            common.out.info(util.format('start (%d) action: %j.', index, act));
            exports.startMap[act.type](act.content, next);
          }
        });
      });
      async.series(tasks, function(err) {
        common.out.info(util.format('leaving dir: %s.', pkgPath));
        process.chdir(oldcwd);
        if (err) { throw err; return; }
        common.out.info('all started.');
        process.exit(0);
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
