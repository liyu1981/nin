var _ = require('underscore');
var common = require('./common');

exports.installPkg = function(pkg) {
  var npm = require('npm');
  npm.load(function (er, npm) {
    npm.commands.install([pkg], function(err, result) {
      if (err) {
        common.out.error(err);
        process.exit(1);
      }
      var pkginfo = _.last(result);
      console.log(pkginfo[0], 'was installed to', pkginfo[1]);
      // pkg should installed in node_modules, go to configure action
      require('./setup').setup(require('path').resolve(process.cwd(), pkginfo[1]));
    });
  })
};

exports.register = function(program) {
  var c =
    program
      .command('deploy <pkg>')
      .description(common.formatDescription(['Install your app.',
        '<pkg> can be any llegal npm pkg names.',
        'Ref https://www.npmjs.org/doc/cli/npm-install.html']));

  c.action(function(pkg) {
    exports.installPkg(pkg);
  });
};
