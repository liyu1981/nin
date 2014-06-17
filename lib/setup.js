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
  var options = { env: common.getNinEnvForChildProcess() };
  common.execCmd('bash \"' + bashPath + '\"', options,
    function(code) {
      if (code !== 0) {
        next(new Error(util.format('execution of %s failed: %d.', bashPath, code)));
      } else {
        common.out.info(util.format('succeeded in execution of %s.', bashPath));
        next(null);
      }
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
      // npm install all dev dependencies
      var deps = pkgJson.devDependencies;
      if (deps) {
        npm.load(function (err, npm) {
          if (err) { return next(err); }
          // simpley npm install . to install all deps(and dev deps)
          npm.commands.install(['.'], function(err, result) {
            if (err) {
              return next(new Error(util.format('npm install %s failed: %j.', depName, err)));
            }
            devInstalled = Object.keys(deps);
            common.out.info('dev dependencies installed: %j.', devInstalled);
            next(null);
          });
        });
      } else {
        next(null);
      }
    },
    function(next) {
      // now run the grunt file
      // notice that we will never callback an error, since if any grunt file failed,
      // we still need to proceed to cleanup phase
      var g = null, gf = null;
      var gpath = path.resolve(process.cwd(), 'node_modules/grunt/lib/grunt.js');
      try {
        g = require(gpath);
        gf = require(gruntFilePath);
      } catch(err) {
        common.out.error(util.format('can not require file, may be currupted: %j.', err));
        next(null);
      }
      if (g) {
        gf(g);
        g.tasks(['default'], { colors: false }, function(err) {
          if (err) {
            common.out.error(util.format('grunt file: %s execution failed: %j.', gruntFilePath, err));
          }
          next(null);
        });
      } else {
        common.out.error(util.format('grunt file: %s may be empty.', gruntFilePath));
        next(null);
      }
    },
    function(next) {
      // npm uninstall all dependencies
      if (devInstalled && devInstalled.length >= 1) {
        // have to remove one by one, since npm does not have a `remove --dev` cmd
        var tasks = devInstalled.map(function(depName) {
          return function(next) {
            npm.load(function (err, npm) {
              if (err) { next(err); }
              npm.commands.remove([depName], function(err, result) {
                if (err) {
                  next(new Error(util.format('npm remove %s failed: %j.', depName, err)));
                } else {
                  common.out.info(util.format('removed dev dep: %s.', depName));
                  next(null);
                }
              });
            });
          };
        });
        async.series(tasks, function(err) {
          if (err) { return next(err); }
          common.out.info('all dev dependencies removed.');
          next(null);
        });
      } else {
        next(null);
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

exports.setup = function(pkgPath, next) {
  common.readNinConf(pkgPath, function(err, conf) {
    if (err) { return next(err); }
    var oldcwd = process.cwd();
    common.out.info(util.format('entering dir: %s.', pkgPath));
    process.chdir(pkgPath);
    if (conf.setup) {
      common.out.info(util.format('%d targets found.', conf.setup.length));
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
        common.out.info(util.format('leaving dir: %s.', pkgPath));
        process.chdir(oldcwd);
        if (err) { return next(err); }
        common.out.info('all tasks done.');
        next();
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
        exports.setup(p, common.throwOutOrExit);
      } catch(err) {
        process.exit(1);
      }
    } else {
      common.out.error(util.format('pkg %s not found at %s.', pkgname, p));
      process.exit(1);
    }
  });
};
