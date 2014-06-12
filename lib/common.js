var _ = require('underscore');

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
      'layout': { 'type': 'pattern', 'pattern': '%m' }
    }],
    'replaceConsole': true
  });
})();

exports.formatDescription = function(contents) {
  if (_.isArray(contents)) {
    return contents.join('\n  > ') + '\n';
  } else {
    return contents.toString();
  }
};
