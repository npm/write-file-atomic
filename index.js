'use strict'
var fs = require('graceful-fs')
var chain = require('slide').chain
var MurmurHash3 = require('imurmurhash')

function murmurhex () {
  var hash = new MurmurHash3()
  for (var ii = 0; ii < arguments.length; ++ii) hash.hash('' + arguments[ii])
  return hash.result()
}
var invocations = 0
var getTmpname = function (filename) {
  return filename + '.' + murmurhex(__filename, process.pid, ++invocations)
}

module.exports = function writeFile (filename, data, options, callback) {
  if (options instanceof Function) {
    callback = options
    options = null
  }
  if (!options) options = {}
  var tmpfile = getTmpname(filename)

  function computeOptions (filename, cb) {
    if (options.mode && options.chmod) {
      cb(options)
    } else {
      // Either mode or chown is not explicitly set
      // Default behavior is to copy it from original file
      fs.stat(filename, function (err, stats) {
        var newOptions = {}
        for (var key in options) {
          if ({}.hasOwnProperty.call(options, key)) {
            newOptions[key] = options[key]
          }
        }
        if (!err && stats && !options.mode) {
          newOptions.mode = stats.mode
        }
        if (!err && stats && !options.chown && process.getuid) {
          newOptions.chown = { uid: stats.uid, gid: stats.gid }
        }
        cb(newOptions)
      })
    }
  }

  // We can't use computeOptions as part of chain because
  // "options.chown &&" is evaluated before computeOptions has chance to run
  computeOptions(filename, function (options) {
    chain([
      [fs, fs.writeFile, tmpfile, data, options.encoding || 'utf8'],
      options.mode && [fs, fs.chmod, tmpfile, options.mode],
      options.chown && [fs, fs.chown, tmpfile, options.chown.uid, options.chown.gid],
      [fs, fs.rename, tmpfile, filename]
    ], function (err) {
      err ? fs.unlink(tmpfile, function () { callback(err) })
        : callback()
    })
  })
}

module.exports.sync = function writeFileSync (filename, data, options) {
  if (!options) options = {}
  var tmpfile = getTmpname(filename)

  function computeOptions (options, filename, cb) {
    if (!options.mode || !options.chmod) {
      var newOptions = {}
      for (var key in options) {
        if ({}.hasOwnProperty.call(options, key)) {
          newOptions[key] = options[key]
        }
      }
      // Either mode or chown is not explicitly set
      // Default behavior is to copy it from original file
      try {
        var stats = fs.statSync(filename)

        if (!options.mode) {
          newOptions.mode = stats.mode
        }
        if (!options.chown && process.getuid) {
          newOptions.chown = { uid: stats.uid, gid: stats.gid }
        }
      } catch (e) {
      }

      return newOptions
    }

    return options
  }

  try {
    options = computeOptions(options, filename)
    fs.writeFileSync(tmpfile, data, options.encoding || 'utf8')
    if (options.chown) fs.chownSync(tmpfile, options.chown.uid, options.chown.gid)
    if (options.mode) fs.chmodSync(tmpfile, options.mode)
    fs.renameSync(tmpfile, filename)
  } catch (err) {
    try { fs.unlinkSync(tmpfile) } catch (e) {}
    throw err
  }
}
