var _ = require('underscore');
var util = require('util');
var fs = require('fs');
var path = require('path');

exports.ninenv = (function() {
  var p = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json')).toString());
  return {
    pkginfo: p,
    pkgdir: process.cwd()
  };
})();

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

exports.runCmd = function(cmdstr, options, callback, hooks) {
  var exec = require('child_process').exec;
  var child = exec(cmdstr, options || null);
  var out = '';
  var err = '';
  // first default hooks
  child.stdout.on('data', function(buffer) { out += buffer.toString(); });
  child.stderr.on('data', function(buffer) { err += buffer.toString(); });
  child.on('close', function(code) { callback(code, out, err); });
  // then customized hooks
  hooks && hooks(child);
};

exports.readNinConf = function(pkgPath, callback) {
  var p = path.resolve(pkgPath, 'nin.json');
  if (!fs.existsSync(p)) {
    return callback(new Error(util.format('No nin.json in pkg path %s.', pkgPath)));
  }
  fs.readFile(p, function(err, content) {
    if (err) {
      return callback(new Error(util.format('Read nin.json in pkg path %s failed: %j.', pkgpath, err)));
    } else {
      var j = JSON.parse(content);
      common.out.info(util.format('nin.json of %s read.', pkgPath));
      callback(null, j);
    }
  });
};
