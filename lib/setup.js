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
  common.runCmd('bash', [ bashPath ],
    function(code) {
      if (code !== 0) {
        throw new Error(util.format('Execution of %s failed: %d.', bashPath, code));
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
  var devInstalled = [];
  async.series([
    function(cb) {
      // npm install all dependencies
      var deps = j.dependencies;
      if (deps) {
        var tasks = [];
        Object.keys(deps).forEach(function(depName) {
          tasks.push(function(callback) {
            npm.commands.install([util.format('%s@"%s"', depName, deps[depName])], function(err, result) {
              if (err) {
                callback(util.format('npm install %s failed: %j.', depName, err));
              } else {
                callback(null, depName);
              }
            });
          });
        });
        async.series(tasks, function(err, results) {
          if (err) {
            cb(err);
          } else {
            devInstalled = results;
          }
        });
      }
  },
  function(cb) {
    // now run the grunt file
    // notice that we will never callback an error, since if any grunt file failed,
    // we still need to proceed to cleanup phase
    var g = null;
    try {
      g = require(gruntFilePath);
    } catch(err) {
      common.out.error(util.format('Grunt file: %s may be currupted: %j.', gruntFilePath, err));
      cb(null);
    }
    if (g) {
      g.cli(null, function(err) {
        if (err) {
          common.out.error(util.format('Grunt file: %s execution failed: %j.', gruntFilePath, err));
        }
        cb(null);
      });
    } else {
      common.out.error(util.format('Grunt file: %s may be empty.', gruntFilePath));
      cb(null);
    }
  },
  function(cb) {
    // npm uninstall all dependencies
    if (devInstalled.length >= 1) {
      var tasks = [];
      devInstalled.forEach(function(depName) {
        tasks.push(function(callback) {
          npm.commands.remove([depName], function(err, result) {
            if (err) {
              callback(util.format('npm remove %s failed: %j.', depName, err));
            } else {
              callback(null, depName);
            }
          });
        });
      });
      async.series(tasks, function(err, results) {
        if (err) {
          cb(err);
        }
      });
    }
  }],
  function(err, results) {
    if (err) {
      throw new Error(err);
    }
    next(null);
  });
}

exports.actionMap = {
  'bash': bashAction,
  'grunt': gruntAction
};

function doSetup(j, next) {
  // now here are guts
  if (j.actions) {
    common.out.info(util.format('%d targets found.', j.actions.length));
    var tasks = [];
    j.actions.forEach(function(action, index) {
      tasks.push(function(callback) {
        if (exports.actionMap[action.type]) {
          common.out.info(util.format('execute (%d) task: %j.', index, action));
          exports.actionMap[action.type](action.content, callback);
        } else {
          common.out.info(util.format('skip (%d) %s task.', index, action.type));
        }
      });
    });
    async.series(tasks, function(err) {
      common.out.info('all tasks done.');
      next();
    });
  }
}

exports.setup = function(pkgpath) {
  var p = path.resolve(pkgpath, 'nin.json');
  if (!fs.existsSync(p)) {
    var msg = util.format('No nin.json in pkg path %s.', pkgpath);
    common.out.error(msg);
    throw new Error(msg);
    return;
  }

  fs.readFile(p, function(err, content) {
    if (err) {
      common.out.error(util.format('Read nin.json in pkg path %s failed: %j.', pkgpath, err));
    } else {
      var j = JSON.parse(content);
      common.out.info(util.format('nin.json of %s read.', pkgpath));
      var oldcwd = process.cwd();
      common.out.info(util.format('enter dir: %s.', pkgpath));
      process.chdir(pkgpath);
      doSetup(j, function(err) {
        common.out.info(util.format('leave dir: %s.', pkgpath));
        process.chdir(oldcwd);
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
