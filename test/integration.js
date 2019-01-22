'use strict'
var fs = require('graceful-fs')
var path = require('path')
var test = require('tap').test
var mkdirp = require('mkdirp')
var rimraf = require('rimraf')
var requireInject = require('require-inject')

var workdir = path.join(__dirname, path.basename(__filename, '.js'))
var testfiles = 0
function tmpFile () {
  return path.join(workdir, 'test-' + (++testfiles))
}

function readFile (path) {
  return fs.readFileSync(path).toString()
}

function didWriteFileAtomic (t, expected, filename, data, options, callback) {
  if (options instanceof Function) {
    callback = options
    options = null
  }
  if (!options) options = {}
  var actual = {}
  var writeFileAtomic = requireInject('../index.js', {
    'graceful-fs': Object.assign({}, fs, {
      chown: function mockChown (filename, uid, gid, cb) {
        actual.uid = uid
        actual.gid = gid
        process.nextTick(cb)
      },
      stat: function mockStat (filename, cb) {
        fs.stat(filename, function (err, stats) {
          if (err) return cb(err)
          cb(null, Object.assign(stats, expected || {}))
        })
      }
    })
  })
  return writeFileAtomic(filename, data, options, function (err) {
    t.isDeeply(actual, expected, 'ownership is as expected')
    callback(err)
  })
}

function didWriteFileAtomicSync (t, expected, filename, data, options) {
  var actual = {}
  var writeFileAtomic = requireInject('../index.js', {
    'graceful-fs': Object.assign({}, fs, {
      chownSync: function mockChownSync (filename, uid, gid) {
        actual.uid = uid
        actual.gid = gid
      },
      statSync: function mockStatSync (filename) {
        var stats = fs.statSync(filename)
        return Object.assign(stats, expected || {})
      }
    })
  })
  writeFileAtomic.sync(filename, data, options)
  t.isDeeply(actual, expected)
}

function currentUser () {
  return {
    uid: process.getuid(),
    gid: process.getgid()
  }
}

test('setup', function (t) {
  rimraf.sync(workdir)
  mkdirp.sync(workdir)
  t.done()
})

test('writes simple file (async)', function (t) {
  t.plan(3)
  var file = tmpFile()
  didWriteFileAtomic(t, {}, file, '42', function (err) {
    t.ifError(err, 'no error')
    t.is(readFile(file), '42', 'content ok')
  })
})

test('writes buffers to simple file (async)', function (t) {
  t.plan(3)
  var file = tmpFile()
  didWriteFileAtomic(t, {}, file, Buffer.from('42'), function (err) {
    t.ifError(err, 'no error')
    t.is(readFile(file), '42', 'content ok')
  })
})

test('writes undefined to simple file (async)', function (t) {
  t.plan(3)
  var file = tmpFile()
  didWriteFileAtomic(t, {}, file, undefined, function (err) {
    t.ifError(err, 'no error')
    t.is(readFile(file), '', 'content ok')
  })
})

test('writes to symlinks without clobbering (async)', function (t) {
  t.plan(5)
  var file = tmpFile()
  var link = tmpFile()
  fs.writeFileSync(file, '42')
  fs.symlinkSync(file, link)
  didWriteFileAtomic(t, currentUser(), link, '43', function (err) {
    t.ifError(err, 'no error')
    t.is(readFile(file), '43', 'target content ok')
    t.is(readFile(link), '43', 'link content ok')
    t.ok(fs.lstatSync(link).isSymbolicLink(), 'link is link')
  })
})

test('runs chown on given file (async)', function (t) {
  var file = tmpFile()
  didWriteFileAtomic(t, { uid: 42, gid: 43 }, file, '42', { chown: { uid: 42, gid: 43 } }, function (err) {
    t.ifError(err, 'no error')
    t.is(readFile(file), '42', 'content ok')
    t.done()
  })
})

test('runs chmod on given file (async)', function (t) {
  t.plan(5)
  var file = tmpFile()
  didWriteFileAtomic(t, {}, file, '42', { mode: parseInt('741', 8) }, function (err) {
    t.ifError(err, 'no error')
    var stat = fs.statSync(file)
    t.is(stat.mode, parseInt('100741', 8))
    didWriteFileAtomic(t, { uid: 42, gid: 43 }, file, '23', { chown: { uid: 42, gid: 43 } }, function (err) {
      t.ifError(err, 'no error')
    })
  })
})

test('run chmod AND chown (async)', function (t) {
  t.plan(3)
  var file = tmpFile()
  didWriteFileAtomic(t, { uid: 42, gid: 43 }, file, '42', { mode: parseInt('741', 8), chown: { uid: 42, gid: 43 } }, function (err) {
    t.ifError(err, 'no error')
    var stat = fs.statSync(file)
    t.is(stat.mode, parseInt('100741', 8))
  })
})

test('does not change chmod by default (async)', function (t) {
  t.plan(5)
  var file = tmpFile()
  didWriteFileAtomic(t, {}, file, '42', { mode: parseInt('741', 8) }, function (err) {
    t.ifError(err, 'no error')

    didWriteFileAtomic(t, currentUser(), file, '43', function (err) {
      t.ifError(err, 'no error')
      var stat = fs.statSync(file)
      t.is(stat.mode, parseInt('100741', 8))
    })
  })
})

test('does not change chown by default (async)', function (t) {
  t.plan(6)
  var file = tmpFile()
  didWriteFileAtomic(t, { uid: 42, gid: 43 }, file, '42', { chown: { uid: 42, gid: 43 } }, _setModeOnly)

  function _setModeOnly (err) {
    t.ifError(err, 'no error')

    didWriteFileAtomic(t, { uid: 42, gid: 43 }, file, '43', { mode: parseInt('741', 8) }, _allDefault)
  }

  function _allDefault (err) {
    t.ifError(err, 'no error')

    didWriteFileAtomic(t, { uid: 42, gid: 43 }, file, '43', _noError)
  }

  function _noError (err) {
    t.ifError(err, 'no error')
  }
})

test('writes simple file (sync)', function (t) {
  t.plan(2)
  var file = tmpFile()
  didWriteFileAtomicSync(t, {}, file, '42')
  t.is(readFile(file), '42')
})

test('writes simple buffer file (sync)', function (t) {
  t.plan(2)
  var file = tmpFile()
  didWriteFileAtomicSync(t, {}, file, Buffer.from('42'))
  t.is(readFile(file), '42')
})

test('writes undefined file (sync)', function (t) {
  t.plan(2)
  var file = tmpFile()
  didWriteFileAtomicSync(t, {}, file, undefined)
  t.is(readFile(file), '')
})

test('writes to symlinks without clobbering (sync)', function (t) {
  t.plan(4)
  var file = tmpFile()
  var link = tmpFile()
  fs.writeFileSync(file, '42')
  fs.symlinkSync(file, link)
  didWriteFileAtomicSync(t, currentUser(), link, '43')
  t.is(readFile(file), '43', 'target content ok')
  t.is(readFile(link), '43', 'link content ok')
  t.ok(fs.lstatSync(link).isSymbolicLink(), 'link is link')
})

test('runs chown on given file (sync)', function (t) {
  t.plan(1)
  var file = tmpFile()
  didWriteFileAtomicSync(t, { uid: 42, gid: 43 }, file, '42', { chown: { uid: 42, gid: 43 } })
})

test('runs chmod on given file (sync)', function (t) {
  t.plan(3)
  var file = tmpFile()
  didWriteFileAtomicSync(t, {}, file, '42', { mode: parseInt('741', 8) })
  var stat = fs.statSync(file)
  t.is(stat.mode, parseInt('100741', 8))
  didWriteFileAtomicSync(t, { uid: 42, gid: 43 }, file, '23', { chown: { uid: 42, gid: 43 } })
})

test('runs chown and chmod (sync)', function (t) {
  t.plan(2)
  var file = tmpFile()
  didWriteFileAtomicSync(t, { uid: 42, gid: 43 }, file, '42', { mode: parseInt('741', 8), chown: { uid: 42, gid: 43 } })
  var stat = fs.statSync(file)
  t.is(stat.mode, parseInt('100741', 8))
})

test('does not change chmod by default (sync)', function (t) {
  t.plan(3)
  var file = tmpFile()
  didWriteFileAtomicSync(t, {}, file, '42', { mode: parseInt('741', 8) })
  didWriteFileAtomicSync(t, currentUser(), file, '43')
  var stat = fs.statSync(file)
  t.is(stat.mode, parseInt('100741', 8))
})

test('does not change chown by default (sync)', function (t) {
  t.plan(3)
  var file = tmpFile()
  didWriteFileAtomicSync(t, { uid: 42, gid: 43 }, file, '42', { chown: { uid: 42, gid: 43 } })
  didWriteFileAtomicSync(t, { uid: 42, gid: 43 }, file, '43', { mode: parseInt('741', 8) })
  didWriteFileAtomicSync(t, { uid: 42, gid: 43 }, file, '44')
})

test('cleanup', function (t) {
  rimraf.sync(workdir)
  t.done()
})
