'use strict'
module.exports = writeFile
module.exports.sync = writeFileSync
module.exports._getTmpname = getTmpname // for testing

var fs = require('graceful-fs')
var MurmurHash3 = require('imurmurhash')
var extend = Object.assign || require('util')._extend

var invocations = 0
function getTmpname (filename) {
  return filename + '.' +
    MurmurHash3(__filename)
      .hash(String(process.pid))
      .hash(String(++invocations))
      .result()
}

function writeFile (filename, data, options, callback) {
  if (options instanceof Function) {
    callback = options
    options = null
  }
  if (!options) options = {}
  var tmpfile
  new Promise(function determineRealPath (resolve) {
    fs.realpath(filename, function determined (_, realname) {
      filename = realname || filename
      tmpfile = getTmpname(filename)
      resolve()
    })
  }).then(function getStats () {
    return new Promise(function (resolve) {
      if (options.mode && options.chown) {
        resolve()
      } else {
        // Either mode or chown is not explicitly set
        // Default behavior is to copy it from original file
        fs.stat(filename, function (err, stats) {
          if (err || !stats) {
            resolve()
          } else {
            options = extend({}, options)
            if (!options.mode) {
              options.mode = stats.mode
            }
            if (!options.chown && process.getuid) {
              options.chown = { uid: stats.uid, gid: stats.gid }
            }
            resolve()
          }
        })
      }
    })
  }).then(function thenWriteFile () {
    return new Promise(function writing (resolve, reject) {
      fs.writeFile(tmpfile, data, options.encoding || 'utf8', function written (err) {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }).then(function chmoding () {
    if (options.mode) {
      return new Promise(function (resolve, reject) {
        fs.chmod(tmpfile, options.mode, function chmodded (err) {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      })
    }
  }).then(function chowning () {
    if (options.chown) {
      return new Promise(function (resolve, reject) {
        fs.chown(tmpfile, options.chown.uid, options.chown.gid, function chowned (err) {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      })
    }
  }).then(function renaming () {
    return new Promise(function (resolve, reject) {
      fs.rename(tmpfile, filename, function renamed (err) {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }).then(function success () {
    callback()
  }, function failure (err) {
    fs.unlink(tmpfile, function () {
      callback(err)
    })
  })
}

function writeFileSync (filename, data, options) {
  if (!options) options = {}
  try {
    filename = fs.realpathSync(filename)
  } catch (ex) {
    // it's ok, it'll happen on a not yet existing file
  }
  var tmpfile = getTmpname(filename)

  try {
    if (!options.mode || !options.chown) {
      // Either mode or chown is not explicitly set
      // Default behavior is to copy it from original file
      try {
        var stats = fs.statSync(filename)
        options = extend({}, options)
        if (!options.mode) {
          options.mode = stats.mode
        }
        if (!options.chown && process.getuid) {
          options.chown = { uid: stats.uid, gid: stats.gid }
        }
      } catch (ex) {
        // ignore stat errors
      }
    }

    fs.writeFileSync(tmpfile, data, options.encoding || 'utf8')
    if (options.chown) fs.chownSync(tmpfile, options.chown.uid, options.chown.gid)
    if (options.mode) fs.chmodSync(tmpfile, options.mode)
    fs.renameSync(tmpfile, filename)
  } catch (err) {
    try { fs.unlinkSync(tmpfile) } catch (e) {}
    throw err
  }
}
