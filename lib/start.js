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
    cwd: process.cwd(),
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

// copied from https://github.com/flatiron/utile/blob/6594bffb9348bdc1f7e498b12e95b305ccc2d8e6/lib/index.js#L292-L320
//
// ### function randomString (length)
// #### @length {integer} The number of bits for the random base64 string returned to contain
// randomString returns a pseude-random ASCII string (subset)
// the return value is a string of length ⌈bits/6⌉ of characters
// from the base64 alphabet.
//
function _utile_randomString(length) {
  var chars, rand, i, ret, mod, bits;

  chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  ret = '';
  // standard 4
  mod = 4;
  // default is 16
  bits = length * mod || 64;

  // in v8, Math.random() yields 32 pseudo-random bits (in spidermonkey it gives 53)
  while (bits > 0) {
    // 32-bit integer
    rand = Math.floor(Math.random() * 0x100000000);
    //we use the top bits
    for (i = 26; i > 0 && bits > 0; i -= mod, bits -= mod) {
      ret += chars[0x3F & rand >>> i];
    }
  }

  return ret;
}

// our startDaemon function modified from forever.startDaemon
//   https://github.com/nodejitsu/forever/blob/09c4362e3e55d4dd843606cc067290adf7d785db/lib/forever.js#L386-L431
// and we use a customized forever monitor script to provide more notifications than original one.
// check foreverMonitor.js for details.
function _fe_startDaemon(script, options, msgCallback) {
  var forever = require('forever');

  options         = options || {};
  options.uid     = options.uid || _utile_randomString(4).replace(/^\-/, '_');
  options.logFile = forever.logFilePath(options.logFile || forever.config.get('logFile') || options.uid + '.log');
  options.pidFile = forever.pidFilePath(options.pidFile || forever.config.get('pidFile') || options.uid + '.pid');

  var monitor, outFD, errFD, workerPath;

  //
  // This log file is forever's log file - the user's outFile and errFile
  // options are not taken into account here.  This will be an aggregate of all
  // the app's output, as well as messages from the monitor process, where
  // applicable.
  //
  outFD = fs.openSync(options.logFile, 'a');
  errFD = fs.openSync(options.logFile, 'a');
  monitorPath = path.resolve(__dirname, 'foreverMonitor.js');

  monitor = require('child_process').spawn(process.execPath, [monitorPath, script], {
    stdio: ['ipc', outFD, errFD],
    detached: true
  });

  monitor.on('message', function(data) {
    var j = JSON.parse(data);
    msgCallback(j, monitor);
  });
  monitor.send(JSON.stringify(options));
};

function foreverStart(content, next) {
  var cont = content;
  if (_.isString(content)) {
    cont = { script: content, options: {} };
  }
  // foreverDir will be; <pkgPath>/var/forever/<relative path of script>
  //   e.g., cont.script=lib/main.js for myapp
  //         foreverDir=/path/to/myapp/var/forever/lib
  var foreverDirPrefix = 'var/forever/';
  var foreverDir = path.dirname(path.resolve(process.cwd(), foreverDirPrefix + cont.script));
  require('./deploy').utils.ensureDir(foreverDir, null, function(err) {
    if (err) {
      return next(new Error(util.format('starting app %s failed: %j.', cont.script, err)));
    }
    cont.options = _.defaults(cont.options, {
      max: 3,
      pidFile: path.resolve(process.cwd(), foreverDirPrefix + cont.script + '.pid'),
      logFile: path.resolve(process.cwd(), foreverDirPrefix + cont.script + '.log'),
      outFile: path.resolve(process.cwd(), foreverDirPrefix + cont.script + '.out'),
      errFile: path.resolve(process.cwd(), foreverDirPrefix + cont.script + '.err')
    });
    _fe_startDaemon(path.resolve(process.cwd(), cont.script), cont.options,
      function(msgObj, monitor) {
        monitor.disconnect();
        monitor.unref();
        if (msgObj.error) {
          next(new Error(util.format('starting app %s failed: %s.', cont.script, msgObj.error)));
        } else {
          common.out.info(util.format('app started: pid %d.', msgObj.childPid));
          next(null);
        }
      });
  });
}

exports.startMap = {
  'bash': bashStart,
  'forever': foreverStart
};

exports.start = function(pkgPath, next) {
  common.readNinConf(pkgPath, function(err, conf) {
    if (err) { return next(err); }
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
        if (err) { return next(err); }
        common.out.info('all started.');
        next();
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
        exports.start(p, common.throwOutOrExit);
      } catch(err) {
        process.exit(1);
      }
    } else {
      common.out.error(util.format('Pkg %s not found at %s.', pkgname, p));
      process.exit(1);
    }
  });
};
