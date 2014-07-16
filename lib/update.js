var async = require('async');
var util = require('util');
var path = require('path');
var common = require('./common');

exports.register = function(program) {
  var c =
    program
      .command('update <pkgname>')
      .description(common.formatDescription(['Update your app.',
        '<pkgname> is the pkg installed dir name, i.e., some name in <cwd>/node_modules/']));

  c.action(function(pkgname) {
    // do nothing currently
  });
};
