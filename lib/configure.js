var fs = require('fs');
var util = require('util');
var path = require('path');
var common = require('./common');

function doConfigure(j) {
  // now here are guts
}

exports.configure = function(pkgpath) {
  var p = path.resolve(pkgpath, 'nin.json');
  if (!fs.existsSync(p)) {
    common.out.error(util.format('No nin.json in pkg path %s.', pkgpath));
    return;
  }

  fs.readFile(p, function(err, content) {
    if (err) {
      common.out.error(util.format('Read nin.json in pkg path %s failed: %j.', pkgpath, err));
    } else {
      var j = JSON.parse(content);
      doConfigure(j);
    }
  });
};

exports.register = function(program) {
  var c =
    program
      .command('configure <pkgname>')
      .description(common.formatDescription(['Configure your app.',
        '<pkgname> is the pkg installed dir name, i.e., some name in <cwd>/node_modules/']));

  c.action(function(pkgname) {
    var p = path.resolve(process.cwd(), 'node_modules/' + pkgname);
    if (fs.existsSync(p)) {
      exports.configure(p);
    } else {
      common.out.error(util.format('Pkg %s not found at %s.', pkgname, p));
      process.exit(1);
    }
  });
};
