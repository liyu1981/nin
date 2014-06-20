var fs = require('fs');
var util = require('util');
var async = require('async');
var _ = require('underscore');
var path = require('path');
var common = require('./common');

exports.initWizard = function() {
};

exports.register = function(program) {
  var c =
    program
      .command('init')
      .description(common.formatDescription(['Launch wizard to generate nin.json.']));

  c.action(function() {
    exports.initWizard();
  });
};
