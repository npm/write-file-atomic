'use strict'
var test = require('tap').test
var requireInject = require('require-inject')

// defining mock for fs so its functions can be modified
var fs = {
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
  },
  statSync: function (tmpfile) {
    if (/nostat/.test(tmpfile)) throw new Error('ENOSTAT')
  }
}

var writeFileAtomic = requireInject('../index', {
  'fs': fs
})

// preserve original functions
var oldRealPath = fs.realpath
var oldRename = fs.rename

test('ensure writes to the same file are serial', function (t) {
  var fileInUse = false
  var ops = 5 // count for how many concurrent write ops to request
  t.plan(ops * 3 + 3)
  fs.realpath = function () {
    t.false(fileInUse, 'file not in use')
    fileInUse = true
    oldRealPath.apply(writeFileAtomic, arguments)
  }
  fs.rename = function () {
    t.true(fileInUse, 'file in use')
    fileInUse = false
    oldRename.apply(writeFileAtomic, arguments)
  }
  for (var i = 0; i < ops; i++) {
    writeFileAtomic('test', 'test', function (err) {
      if (err) t.fail(err)
      else t.pass('wrote without error')
    })
  }
  setTimeout(function () {
    writeFileAtomic('test', 'test', function (err) {
      if (err) t.fail(err)
      else t.pass('successive writes after delay')
    })
  }, 500)
})

test('allow write to multiple files in parallel, but same file writes are serial', function (t) {
  var filesInUse = []
  var ops = 5
  var wasParallel = false
  fs.realpath = function (filename) {
    filesInUse.push(filename)
    var firstOccurence = filesInUse.indexOf(filename)
    t.equal(filesInUse.indexOf(filename, firstOccurence + 1), -1, 'serial writes') // check for another occurence after the first
    if (filesInUse.length > 1) wasParallel = true // remember that a parallel operation took place
    oldRealPath.apply(writeFileAtomic, arguments)
  }
  fs.rename = function (filename) {
    filesInUse.splice(filesInUse.indexOf(filename), 1)
    oldRename.apply(writeFileAtomic, arguments)
  }
  t.plan(ops * 2 * 2 + 1)
  var opCount = 0
  for (var i = 0; i < ops; i++) {
    writeFileAtomic('test', 'test', function (err) {
      if (err) t.fail(err, 'wrote without error')
      else t.pass('wrote without error')
    })
    writeFileAtomic('test2', 'test', function (err) {
      opCount++
      if (opCount === ops) t.true(wasParallel, 'parallel writes')

      if (err) t.fail(err, 'wrote without error')
      else t.pass('wrote without error')
    })
  }
})
