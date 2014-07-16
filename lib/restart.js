var async = require('async');
var path = require('path');
var util = require('util');
var common = require('./common');

exports.register = function(program) {
  var c =
    program
      .command('restart <pkgname>')
      .description(common.formatDescription(['restart your app.',
        'This equals stop then start your app.',
        '<pkgname> is the pkg installed dir name, i.e., some name in <cwd>/apps/']));

    c.action(function(pkgname) {
      common.setupGlobalOptions(program);
      var p = path.resolve(process.cwd(), 'node_modules/' + pkgname);
      if (fs.existsSync(p)) {
        async.series([
          function(next) {
            require('./stop').stop(p, next);
          },
          function(next) {
            require('./start').start(p, next);
          }
        ], common.throwOutOrExit);
      } else {
        common.out.error(util.format('Pkg %s not found at %s.', pkgname, p));
        process.exit(1);
      }
    });
};
