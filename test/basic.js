'use strict'
const { test } = require('tap')
const requireInject = require('require-inject')

let unlinked = []
const writeFileAtomic = requireInject('../index', {
  'fs': {
    realpath (filename, cb) {
      return cb(null, filename)
    },
    open (tmpfile, options, mode, cb) {
      if (/noopen/.test(tmpfile)) return cb(new Error('ENOOPEN'))
      cb(null, tmpfile)
    },
    write (fd) {
      const cb = arguments[arguments.length - 1]
      if (/nowrite/.test(fd)) return cb(new Error('ENOWRITE'))
      cb()
    },
    fsync (fd, cb) {
      if (/nofsync/.test(fd)) return cb(new Error('ENOFSYNC'))
      cb()
    },
    close (fd, cb) { cb() },
    chown (tmpfile, uid, gid, cb) {
      if (/nochown/.test(tmpfile)) return cb(new Error('ENOCHOWN'))
      cb()
    },
    chmod (tmpfile, mode, cb) {
      if (/nochmod/.test(tmpfile)) return cb(new Error('ENOCHMOD'))
      cb()
    },
    rename (tmpfile, filename, cb) {
      if (/norename/.test(tmpfile)) return cb(new Error('ENORENAME'))
      cb()
    },
    unlink (tmpfile, cb) {
      if (/nounlink/.test(tmpfile)) return cb(new Error('ENOUNLINK'))
      cb()
    },
    stat (tmpfile, cb) {
      if (/nostat/.test(tmpfile)) return cb(new Error('ENOSTAT'))
      cb()
    },
    realpathSync (filename, cb) {
      return filename
    },
    openSync (tmpfile, options) {
      if (/noopen/.test(tmpfile)) throw new Error('ENOOPEN')
      return tmpfile
    },
    writeSync (fd) {
      if (/nowrite/.test(fd)) throw new Error('ENOWRITE')
    },
    fsyncSync (fd) {
      if (/nofsync/.test(fd)) throw new Error('ENOFSYNC')
    },
    closeSync () { },
    chownSync (tmpfile, uid, gid) {
      if (/nochown/.test(tmpfile)) throw new Error('ENOCHOWN')
    },
    chmodSync (tmpfile, mode) {
      if (/nochmod/.test(tmpfile)) throw new Error('ENOCHMOD')
    },
    renameSync (tmpfile, filename) {
      if (/norename/.test(tmpfile)) throw new Error('ENORENAME')
    },
    unlinkSync (tmpfile) {
      if (/nounlink/.test(tmpfile)) throw new Error('ENOUNLINK')
      unlinked.push(tmpfile)
    },
    statSync (tmpfile) {
      if (/nostat/.test(tmpfile)) throw new Error('ENOSTAT')
    }
  }
})
const writeFileAtomicSync = writeFileAtomic.sync

test('getTmpname', t => {
  const getTmpname = writeFileAtomic._getTmpname
  const a = getTmpname('abc.def')
  const b = getTmpname('abc.def')
  t.notEqual(a, b, 'different invocations of getTmpname get different results')
  t.done()
})

test('cleanupOnExit', t => {
  const file = 'tmpname'
  unlinked = []
  const cleanup = writeFileAtomic._cleanupOnExit(() => file)
  cleanup()
  t.isDeeply(unlinked, [file], 'cleanup code unlinks')
  const cleanup2 = writeFileAtomic._cleanupOnExit('nounlink')
  t.doesNotThrow(cleanup2, 'exceptions are caught')
  unlinked = []
  t.done()
})

test('async tests', t => {
  t.plan(14)
  writeFileAtomic('good', 'test', { mode: '0777' }, err => {
    t.notOk(err, 'No errors occur when passing in options')
  })
  writeFileAtomic('good', 'test', 'utf8', err => {
    t.notOk(err, 'No errors occur when passing in options as string')
  })
  writeFileAtomic('good', 'test', undefined, err => {
    t.notOk(err, 'No errors occur when NOT passing in options')
  })
  writeFileAtomic('good', 'test', err => {
    t.notOk(err)
  })
  writeFileAtomic('noopen', 'test', err => {
    t.is(err && err.message, 'ENOOPEN', 'fs.open failures propagate')
  })
  writeFileAtomic('nowrite', 'test', err => {
    t.is(err && err.message, 'ENOWRITE', 'fs.writewrite failures propagate')
  })
  writeFileAtomic('nowrite', Buffer.from('test', 'utf8'), err => {
    t.is(err && err.message, 'ENOWRITE', 'fs.writewrite failures propagate for buffers')
  })
  writeFileAtomic('nochown', 'test', { chown: { uid: 100, gid: 100 } }, err => {
    t.is(err && err.message, 'ENOCHOWN', 'Chown failures propagate')
  })
  writeFileAtomic('nochown', 'test', err => {
    t.notOk(err, 'No attempt to chown when no uid/gid passed in')
  })
  writeFileAtomic('nochmod', 'test', { mode: parseInt('741', 8) }, err => {
    t.is(err && err.message, 'ENOCHMOD', 'Chmod failures propagate')
  })
  writeFileAtomic('nofsyncopt', 'test', { fsync: false }, err => {
    t.notOk(err, 'fsync skipped if options.fsync is false')
  })
  writeFileAtomic('norename', 'test', err => {
    t.is(err && err.message, 'ENORENAME', 'Rename errors propagate')
  })
  writeFileAtomic('norename nounlink', 'test', err => {
    t.is(err && err.message, 'ENORENAME', 'Failure to unlink the temp file does not clobber the original error')
  })
  writeFileAtomic('nofsync', 'test', err => {
    t.is(err && err.message, 'ENOFSYNC', 'Fsync failures propagate')
  })
})

test('sync tests', t => {
  t.plan(16)
  const throws = function (shouldthrow, msg, todo) {
    let err
    try { todo() } catch (e) { err = e }
    t.is(shouldthrow, err && err.message, msg)
  }
  const noexception = function (msg, todo) {
    let err
    try { todo() } catch (e) { err = e }
    t.ifError(err, msg)
  }
  let tmpfile

  noexception('No errors occur when passing in options', () => {
    writeFileAtomicSync('good', 'test', { mode: '0777' })
  })
  noexception('No errors occur when passing in options as string', () => {
    writeFileAtomicSync('good', 'test', 'utf8')
  })
  noexception('No errors occur when NOT passing in options', () => {
    writeFileAtomicSync('good', 'test')
  })
  noexception('fsync never called if options.fsync is falsy', () => {
    writeFileAtomicSync('good', 'test', { fsync: false })
  })
  noexception('tmpfileCreated is called on success', () => {
    writeFileAtomicSync('good', 'test', {
      tmpfileCreated (gottmpfile) {
        tmpfile = gottmpfile
      }
    })
    t.match(tmpfile, /^good\.\d+$/, 'tmpfileCreated called for success')
  })

  tmpfile = undefined
  throws('ENOOPEN', 'fs.openSync failures propagate', () => {
    writeFileAtomicSync('noopen', 'test', {
      tmpfileCreated (gottmpfile) {
        tmpfile = gottmpfile
      }
    })
  })
  t.is(tmpfile, undefined, 'tmpfileCreated not called for open failure')

  throws('ENOWRITE', 'fs.writeSync failures propagate', () => {
    writeFileAtomicSync('nowrite', 'test', {
      tmpfileCreated (gottmpfile) {
        tmpfile = gottmpfile
      }
    })
  })
  t.match(tmpfile, /^nowrite\.\d+$/, 'tmpfileCreated called for failure after open')

  throws('ENOCHOWN', 'Chown failures propagate', () => {
    writeFileAtomicSync('nochown', 'test', { chown: { uid: 100, gid: 100 } })
  })
  noexception('No attempt to chown when false passed in', () => {
    writeFileAtomicSync('nochown', 'test', { chown: false })
  })
  noexception('No errors occurred when chown is undefined and original file owner used', () => {
    writeFileAtomicSync('chowncopy', 'test', { chown: undefined })
  })
  throws('ENORENAME', 'Rename errors propagate', () => {
    writeFileAtomicSync('norename', 'test')
  })
  throws('ENORENAME', 'Failure to unlink the temp file does not clobber the original error', () => {
    writeFileAtomicSync('norename nounlink', 'test')
  })
  throws('ENOFSYNC', 'Fsync errors propagate', () => {
    writeFileAtomicSync('nofsync', 'test')
  })
})

test('promises', async t => {
  let tmpfile
  await writeFileAtomic('good', 'test', {
    tmpfileCreated (gottmpfile) {
      tmpfile = gottmpfile
    }
  })
  t.match(tmpfile, /^good\.\d+$/, 'tmpfileCreated is called for success')

  await writeFileAtomic('good', 'test', {
    tmpfileCreated (gottmpfile) {
      return Promise.resolve()
    }
  })

  await t.rejects(writeFileAtomic('good', 'test', {
    tmpfileCreated () {
      return Promise.reject(new Error('reject from tmpfileCreated'))
    }
  }))

  await t.rejects(writeFileAtomic('good', 'test', {
    tmpfileCreated () {
      throw new Error('throw from tmpfileCreated')
    }
  }))

  tmpfile = undefined
  await t.rejects(writeFileAtomic('noopen', 'test', {
    tmpfileCreated (gottmpfile) {
      tmpfile = gottmpfile
    }
  }))
  t.is(tmpfile, undefined, 'tmpfileCreated is not called on open failure')

  await t.rejects(writeFileAtomic('nowrite', 'test', {
    tmpfileCreated (gottmpfile) {
      tmpfile = gottmpfile
    }
  }))
  t.match(tmpfile, /^nowrite\.\d+$/, 'tmpfileCreated is called if failure is after open')
})
