'use strict'
var test = require('tap').test
var requireInject = require('require-inject')

var unlinked = []
var writeFileAtomic = requireInject('../index', {
  'graceful-fs': {
    realpath: function (filename, cb) {
      return cb(null, filename)
    },
    open: function (tmpfile, options, mode, cb) {
      if (/noopen/.test(tmpfile)) return cb(new Error('ENOOPEN'))
      cb(null, tmpfile)
    },
    write: function (fd) {
      var cb = arguments[arguments.length - 1]
      if (/nowrite/.test(fd)) return cb(new Error('ENOWRITE'))
      cb()
    },
    fsync: function (fd, cb) {
      if (/nofsync/.test(fd)) return cb(new Error('ENOFSYNC'))
      cb()
    },
    close: function (fd, cb) { cb() },
    chown: function (tmpfile, uid, gid, cb) {
      if (/nochown/.test(tmpfile)) return cb(new Error('ENOCHOWN'))
      cb()
    },
    chmod: function (tmpfile, mode, cb) {
      if (/nochmod/.test(tmpfile)) return cb(new Error('ENOCHMOD'))
      cb()
    },
    rename: function (tmpfile, filename, cb) {
      if (/norename/.test(tmpfile)) return cb(new Error('ENORENAME'))
      cb()
    },
    unlink: function (tmpfile, cb) {
      if (/nounlink/.test(tmpfile)) return cb(new Error('ENOUNLINK'))
      cb()
    },
    stat: function (tmpfile, cb) {
      if (/nostat/.test(tmpfile)) return cb(new Error('ENOSTAT'))
      cb()
    },
    realpathSync: function (filename, cb) {
      return filename
    },
    openSync: function (tmpfile, options) {
      if (/noopen/.test(tmpfile)) throw new Error('ENOOPEN')
      return tmpfile
    },
    writeSync: function (fd) {
      if (/nowrite/.test(fd)) throw new Error('ENOWRITE')
    },
    fsyncSync: function (fd) {
      if (/nofsync/.test(fd)) throw new Error('ENOFSYNC')
    },
    closeSync: function () { },
    chownSync: function (tmpfile, uid, gid) {
      if (/nochown/.test(tmpfile)) throw new Error('ENOCHOWN')
    },
    chmodSync: function (tmpfile, mode) {
      if (/nochmod/.test(tmpfile)) throw new Error('ENOCHMOD')
    },
    renameSync: function (tmpfile, filename) {
      if (/norename/.test(tmpfile)) throw new Error('ENORENAME')
    },
    unlinkSync: function (tmpfile) {
      if (/nounlink/.test(tmpfile)) throw new Error('ENOUNLINK')
      unlinked.push(tmpfile)
    },
    statSync: function (tmpfile) {
      if (/nostat/.test(tmpfile)) throw new Error('ENOSTAT')
    }
  }
})
var writeFileAtomicSync = writeFileAtomic.sync

test('getTmpname', function (t) {
  var getTmpname = writeFileAtomic._getTmpname
  var a = getTmpname('abc.def')
  var b = getTmpname('abc.def')
  t.notEqual(a, b, 'different invocations of getTmpname get different results')
  t.done()
})

test('cleanupOnExit', function (t) {
  var file = 'tmpname'
  unlinked = []
  var cleanup = writeFileAtomic._cleanupOnExit(() => file)
  cleanup()
  t.isDeeply(unlinked, [file], 'cleanup code unlinks')
  var cleanup2 = writeFileAtomic._cleanupOnExit('nounlink')
  t.doesNotThrow(cleanup2, 'exceptions are caught')
  unlinked = []
  t.done()
})

test('async tests', function (t) {
  t.plan(13)
  writeFileAtomic('good', 'test', { mode: '0777' }, function (err) {
    t.notOk(err, 'No errors occur when passing in options')
  })
  writeFileAtomic('good', 'test', 'utf8', function (err) {
    t.notOk(err, 'No errors occur when passing in options as string')
  })
  writeFileAtomic('good', 'test', undefined, function (err) {
    t.notOk(err, 'No errors occur when NOT passing in options')
  })
  writeFileAtomic('noopen', 'test', function (err) {
    t.is(err && err.message, 'ENOOPEN', 'fs.open failures propagate')
  })
  writeFileAtomic('nowrite', 'test', function (err) {
    t.is(err && err.message, 'ENOWRITE', 'fs.writewrite failures propagate')
  })
  writeFileAtomic('nowrite', Buffer.from('test', 'utf8'), function (err) {
    t.is(err && err.message, 'ENOWRITE', 'fs.writewrite failures propagate for buffers')
  })
  writeFileAtomic('nochown', 'test', { chown: { uid: 100, gid: 100 } }, function (err) {
    t.is(err && err.message, 'ENOCHOWN', 'Chown failures propagate')
  })
  writeFileAtomic('nochown', 'test', function (err) {
    t.notOk(err, 'No attempt to chown when no uid/gid passed in')
  })
  writeFileAtomic('nochmod', 'test', { mode: parseInt('741', 8) }, function (err) {
    t.is(err && err.message, 'ENOCHMOD', 'Chmod failures propagate')
  })
  writeFileAtomic('nofsyncopt', 'test', { fsync: false }, function (err) {
    t.notOk(err, 'fsync skipped if options.fsync is false')
  })
  writeFileAtomic('norename', 'test', function (err) {
    t.is(err && err.message, 'ENORENAME', 'Rename errors propagate')
  })
  writeFileAtomic('norename nounlink', 'test', function (err) {
    t.is(err && err.message, 'ENORENAME', 'Failure to unlink the temp file does not clobber the original error')
  })
  writeFileAtomic('nofsync', 'test', function (err) {
    t.is(err && err.message, 'ENOFSYNC', 'Fsync failures propagate')
  })
})

test('sync tests', function (t) {
  t.plan(11)
  var throws = function (shouldthrow, msg, todo) {
    var err
    try { todo() } catch (e) { err = e }
    t.is(shouldthrow, err && err.message, msg)
  }
  var noexception = function (msg, todo) {
    var err
    try { todo() } catch (e) { err = e }
    t.ifError(err, msg)
  }

  noexception('No errors occur when passing in options', function () {
    writeFileAtomicSync('good', 'test', { mode: '0777' })
  })
  noexception('No errors occur when passing in options as string', function () {
    writeFileAtomicSync('good', 'test', 'utf8')
  })
  noexception('No errors occur when NOT passing in options', function () {
    writeFileAtomicSync('good', 'test')
  })
  noexception('fsync never called if options.fsync is falsy', function () {
    writeFileAtomicSync('good', 'test', { fsync: false })
  })
  throws('ENOWRITE', 'fs.writeSync failures propagate', function () {
    writeFileAtomicSync('nowrite', 'test')
  })
  throws('ENOOPEN', 'fs.openSync failures propagate', function () {
    writeFileAtomicSync('noopen', 'test')
  })
  throws('ENOCHOWN', 'Chown failures propagate', function () {
    writeFileAtomicSync('nochown', 'test', { chown: { uid: 100, gid: 100 } })
  })
  noexception('No attempt to chown when no uid/gid passed in', function () {
    writeFileAtomicSync('nochown', 'test')
  })
  throws('ENORENAME', 'Rename errors propagate', function () {
    writeFileAtomicSync('norename', 'test')
  })
  throws('ENORENAME', 'Failure to unlink the temp file does not clobber the original error', function () {
    writeFileAtomicSync('norename nounlink', 'test')
  })
  throws('ENOFSYNC', 'Fsync errors propagate', function () {
    writeFileAtomicSync('nofsync', 'test')
  })
})

test('promise injection', function (t) {
  t.plan(2)
  var usedCustomPromise = false
  class customPromise extends Promise {
    then () {
      usedCustomPromise = true
      return super.then.apply(this, arguments)
    }
  }
  writeFileAtomic('good', 'test', { Promise: customPromise }, function (err) {
    t.notOk(err, 'no errors occur when providing customPromise')
    t.true(usedCustomPromise, 'the custom promise was injected and used')
  })
})
