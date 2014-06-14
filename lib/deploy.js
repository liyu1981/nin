var _ = require('underscore');
var util = require('util');
var common = require('./common');

exports.installPkg = function(pkg) {
  var npm = require('npm');
  npm.load(function (err, npm) {
    if (err) {
      throw new Error(util.format('Loading npm failed: %j.', err));
      return;
    }
    common.out.info(util.format('Now install pkg: %s.', pkg));
    npm.commands.install([pkg], function(err, result) {
      if (err) {
        common.out.error(util.format('Installation of pkg %s failed: %j.', pkg, err));
        throw err;
        return;
      }
      var pkginfo = _.last(result);
      common.out.info(util.format('%s was installed to %s.', pkginfo[0], pkginfo[1]));
      // pkg should installed in node_modules, go to configure action
      require('./setup').setup(require('path').resolve(process.cwd(), pkginfo[1]));
    });
  });
};

exports.register = function(program) {
  var c =
    program
      .command('deploy <pkg>')
      .description(common.formatDescription(['Install your app.',
        '<pkg> can be any llegal npm pkg names.',
        'Ref https://www.npmjs.org/doc/cli/npm-install.html']));

  c.action(function(pkg) {
    common.setupGlobalOptions(program);
    try {
      exports.installPkg(pkg);
    } catch(err) {
      process.exit(1);
    }
  });
};
