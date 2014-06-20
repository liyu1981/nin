var _ = require('underscore');
var util = require('util');
var fs = require('fs');
var path = require('path');

exports.throwOutOrExit = function(err) {
  if (err) {
    throw err;
  } else {
    process.exit(0);
  }
};

exports.ninenv = (function() {
  var p = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json')).toString());
  return {
    pkginfo: p,
    pkgdir: process.cwd()
  };
})();

exports.getNinEnvForChildProcess = function() {
  return _.extend(process.env, _.reduce(exports.ninenv, function(e, value, key) {
    e['NIN_' + key.toUpperCase()] = _.isString(value) ? value : JSON.stringify(value);
    return e;
  }, {}));
};

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

exports.execCmd = function(cmdstr, options, callback, hooks) {
  var child = require('child_process').exec(cmdstr, options || null);
  var out = '';
  var err = '';
  // first default hooks
  if (child.stdout) { child.stdout.on('data', function(buffer) { out += buffer.toString(); }); }
  if (child.stderr) { child.stderr.on('data', function(buffer) { err += buffer.toString(); }); }
  child.on('close', function(code) { callback(code, out, err); });
  // then customized hooks
  hooks && hooks(child);
};

exports.spawnCmd = function(cmd, args, options, hooks) {
  var child = require('child_process').spawn(cmd, args || [], options || null);
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
      exports.out.info(util.format('nin.json of %s read.', pkgPath));
      callback(null, j);
    }
  });
};
