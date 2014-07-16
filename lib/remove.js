var async = require('async');
var util = require('util');
var path = require('path');
var common = require('./common');

exports.register = function(program) {
  var c =
    program
      .command('remove <pkgname>')
      .option('-k, --keep', 'keep old user data')
      .description(common.formatDescription(['Remove your app.',
        '<pkgname> is the pkg installed dir name, i.e., some name in <cwd>/apps/']));

  c.action(function(pkg) {
    common.setupGlobalOptions(program);
    try {
      var pkgName = null;
      async.series([
        function(next) {
          common.out.info(util.format('now deploy: %s.', pkg));
          require('./deploy').deploy(pkg, function(err, p) {
            if (err) { return next(err); }
            pkgName = p;
            next(null);
          });
        },
        function(next) {
          //return next(null);
          common.out.info(util.format('now setup: %s.', path.resolve(process.cwd(), pkgName)));
          require('./setup').setup(path.resolve(process.cwd(), pkgName), next);
        }
      ], common.throwOutOrExit);
    } catch(err) {
      process.exit(1);
    }
  });
};
