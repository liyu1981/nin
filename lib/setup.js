var fs = require('fs');
var util = require('util');
var path = require('path');
var async = require('async');
var _ = require('underscore');
var common = require('./common');

/* bash action

   The content is a relative shell file path to pkg dir.
   That file will be executed in this action.
 */
function bashAction(content, next) {
  var bashPath = path.resolve(process.cwd(), content);
  var options = {
    env: _.reduce(common.ninenv, function(e, value, key) {
      e['NIN_' + key.toUpperCase()] = _.isString(value) ? value : JSON.stringify(value);
      return e;
    }, {})
  };
  //console.log(options);
  common.runCmd('bash \"' + bashPath + '\"', options,
    function(code) {
      if (code !== 0) {
        return next(new Error(util.format('Execution of %s failed: %d.', bashPath, code)));
      }
      next(null);
    },
    function _streamToConsole(child) {
      child.stdout.on('data', function(buffer) { process.stdout.write(buffer.toString()); });
      child.stderr.on('data', function(buffer) { process.stderr.write(buffer.toString()); });
    });
}

/* grunt action

   This is complex :) The content is a relative grunt file path to pkg dir.
   That file will be executed with 'grunt <file>' cmds.
   In detail, the processes are:
     1. npm install in pkg dir to ensure all dev dependencies are there.
     2. grunt <file>.
     3. uninstall all dev dependencies.
 */
function gruntAction(content, next) {
  var npm = require('npm');
  var gruntFilePath = path.resolve(process.cwd(), content);
  // read package.json first
  var pkgJsonPath = path.resolve(process.cwd(), 'package.json');
  var pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath));
  var devInstalled = null;
  async.series([
    function(next) {
      // npm install all dependencies
      var deps = j.dependencies;
      if (deps) {
        var tasks = [];
        Object.keys(deps).forEach(function(depName) {
          tasks.push(function(next) {
            npm.commands.install([util.format('%s@"%s"', depName, deps[depName])], function(err, result) {
              if (err) {
                return next(new Error(util.format('npm install %s failed: %j.', depName, err)));
              }
              next(null, depName);
            });
          });
        });
        async.series(tasks, function(err, results) {
          if (err) {
            next(err);
          } else {
            devInstalled = results;
            next(null);
          }
        });
      }
    },
    function(next) {
      // now run the grunt file
      // notice that we will never callback an error, since if any grunt file failed,
      // we still need to proceed to cleanup phase
      var g = null;
      try {
        g = require(gruntFilePath);
      } catch(err) {
        common.out.error(util.format('Grunt file: %s may be currupted: %j.', gruntFilePath, err));
        next(null);
      }
      if (g) {
        g.cli(null, function(err) {
          if (err) {
            common.out.error(util.format('Grunt file: %s execution failed: %j.', gruntFilePath, err));
          }
          next(null);
        });
      } else {
        common.out.error(util.format('Grunt file: %s may be empty.', gruntFilePath));
        next(null);
      }
    },
    function(next) {
      // npm uninstall all dependencies
      if (devInstalled.length >= 1) {
        var tasks = devInstalled.map(function(depName) {
          return function(next) {
            npm.commands.remove([depName], function(err, result) {
              if (err) {
                next(new Error(util.format('npm remove %s failed: %j.', depName, err)));
              } else {
                next(null, depName);
              }
            });
          };
        });
        async.series(tasks, function(err, results) {
          next(err || null);
        });
      }
    }
  ], function(err, results) {
    next(err || null);
  });
}

// and we expose actionMap, this allows future plugins comein
exports.actionMap = {
  'bash': bashAction,
  'grunt': gruntAction
};

exports.setup = function(pkgPath) {
  common.readNinConf(pkgPath, function(err, conf) {
    if (err) { throw err; return; }
    var oldcwd = process.cwd();
    common.out.info(util.format('enter dir: %s.', pkgpath));
    process.chdir(pkgpath);
    if (conf.setup) {
      common.out.info(util.format('%d targets found.', j.actions.length));
      var tasks = [];
      conf.setup.forEach(function(action, index) {
        tasks.push(function(next) {
          if (exports.actionMap[action.type]) {
            common.out.info(util.format('execute (%d) task: %j.', index, action));
            exports.actionMap[action.type](action.content, next);
          } else {
            common.out.info(util.format('skip (%d) %s task.', index, action.type));
            next(null);
          }
        });
      });
      async.series(tasks, function(err) {
        common.out.info(util.format('leave dir: %s.', pkgpath));
        process.chdir(oldcwd);
        if (err) { throw err; return; }
        common.out.info('all tasks done.');
      });
    }
  });
};

exports.register = function(program) {
  var c =
    program
      .command('setup <pkgname>')
      .description(common.formatDescription(['Setup your app.',
        '<pkgname> is the pkg installed dir name, i.e., some name in <cwd>/node_modules/']));

  c.action(function(pkgname) {
    common.setupGlobalOptions(program);
    var p = path.resolve(process.cwd(), 'node_modules/' + pkgname);
    if (fs.existsSync(p)) {
      try {
        exports.setup(p);
      } catch(err) {
        process.exit(1);
      }
    } else {
      common.out.error(util.format('Pkg %s not found at %s.', pkgname, p));
      process.exit(1);
    }
  });
};
