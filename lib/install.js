var async = require('async');
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
    common.setupGlobalOptions(program);
    try {
      var pkgName = null;
      async.series([
        function(next) {
          require('./deploy').deploy(pkg, function(err, p) {
            if (err) { return next(err); }
            pkgName = p;
            next(null);
          });
        },
        function(next) {
          require('./setup').setup(pkgName, next);
        }
      ], common.throwOutOrExit);
    } catch(err) {
      process.exit(1);
    }
  });
};
