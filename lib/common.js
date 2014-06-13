var _ = require('underscore');
var util = require('util');

exports.cwd = process.cwd();

exports.out = (function() {
  function Out(conf) {
    this._log4js = require('log4js');
    this._log4js.configure(conf);
    this._logger = this._log4js.getLogger('nin');

    // delegate _logger's methods
    var self = this;
    ['setLevel', 'trace', 'debug', 'info', 'warn', 'error', 'fatal'].forEach(function(name) {
      self[name] = (function(f, context) {
        return function() {
          return f.apply(context, Array.prototype.slice.call(arguments));
        };
      })(self._logger[name], self._logger);
    });
  }

  Out.prototype.reconf = function(conf) {
    this._log4js.configure(conf);
  };

  return new Out({
    'appenders': [{
      'type': 'console',
      'layout': { 'type': 'pattern', 'pattern': '[%p] %m' }
    }],
    'replaceConsole': false
  });
})();

exports.setupGlobalOptions = function(program) {
  if (program.quiet) {
    exports.out.setLevel('ERROR');
  }
};

exports.formatDescription = function(contents) {
  if (_.isArray(contents)) {
    return contents.join('\n  > ') + '\n';
  } else {
    return contents.toString();
  }
};

exports.runCmd = function(cmd, args, callback, hooks) {
  var spawn = require('child_process').spawn;
  var child = spawn(cmd, args);
  var out = '';
  var err = '';
  // first default hooks
  child.stdout.on('data', function(buffer) { out += buffer.toString(); });
  child.stderr.on('data', function(buffer) { err += buffer.toString(); });
  child.on('close', function(code) { callback(code, out, err); });
  // then customized hooks
  hooks && hooks(child);
};
