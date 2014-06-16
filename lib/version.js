var util = require('util');
var common = require('./common');

exports.register = function(program) {
  var c =
    program
      .command('version')
      .description(common.formatDescription('Show version info.'));

  c.action(function() {
    console.log(util.format('%s version %s\n%s',
      common.ninenv.pkginfo.name, common.ninenv.pkginfo.version, common.ninenv.pkginfo.description));
    process.exit(0);
  });
};
