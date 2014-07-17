var async = require('async');
var util = require('util');
var path = require('path');
var common = require('./common');

exports.register = function(program) {
  var c =
    program
      .command('install <pkg>')
      .description(common.formatDescription(['Install your app.',
        'This equals deploy then setup.',
        '<pkg> can be any llegal npm pkg names.',
        'Ref https://www.npmjs.org/doc/cli/npm-install.html']));

  c.action(function(pkg) {
    try {
      common.setupGlobalOptions(program);
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
      common.out.error(err);
      process.exit(1);
    }
  });
};
