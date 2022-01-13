'use strict'
const t = require('tap')

let expectClose = 0
let closeCalled = 0
let expectCloseSync = 0
let closeSyncCalled = 0
const createErr = code => Object.assign(new Error(code), { code })

let unlinked = []
const writeFileAtomic = t.mock('..', {
  fs: {
    realpath (filename, cb) {
      return cb(null, filename)
    },
    open (tmpfile, options, mode, cb) {
      if (/noopen/.test(tmpfile)) {
        return cb(createErr('ENOOPEN'))
      }
      expectClose++
      cb(null, tmpfile)
    },
    write (fd) {
      const cb = arguments[arguments.length - 1]
      if (/nowrite/.test(fd)) {
        return cb(createErr('ENOWRITE'))
      }
      cb()
    },
    fsync (fd, cb) {
      if (/nofsync/.test(fd)) {
        return cb(createErr('ENOFSYNC'))
      }
      cb()
    },
    close (fd, cb) {
      closeCalled++
      cb()
    },
    chown (tmpfile, uid, gid, cb) {
      if (/nochown/.test(tmpfile)) {
        return cb(createErr('ENOCHOWN'))
      }
      if (/enosys/.test(tmpfile)) {
        return cb(createErr('ENOSYS'))
      }
      if (/einval/.test(tmpfile)) {
        return cb(createErr('EINVAL'))
      }
      if (/eperm/.test(tmpfile)) {
        return cb(createErr('EPERM'))
      }
      cb()
    },
    chmod (tmpfile, mode, cb) {
      if (/nochmod/.test(tmpfile)) {
        return cb(createErr('ENOCHMOD'))
      }
      if (/enosys/.test(tmpfile)) {
        return cb(createErr('ENOSYS'))
      }
      if (/eperm/.test(tmpfile)) {
        return cb(createErr('EPERM'))
      }
      if (/einval/.test(tmpfile)) {
        return cb(createErr('EINVAL'))
      }
      cb()
    },
    rename (tmpfile, filename, cb) {
      if (/norename/.test(tmpfile)) {
        return cb(createErr('ENORENAME'))
      }
      cb()
    },
    unlink (tmpfile, cb) {
      if (/nounlink/.test(tmpfile)) {
        return cb(createErr('ENOUNLINK'))
      }
      cb()
    },
    stat (tmpfile, cb) {
      if (/nostat/.test(tmpfile)) {
        return cb(createErr('ENOSTAT'))
      }
      cb()
    },
    realpathSync (filename, cb) {
      return filename
    },
    openSync (tmpfile, options) {
      if (/noopen/.test(tmpfile)) {
        throw createErr('ENOOPEN')
      }
      expectCloseSync++
      return tmpfile
    },
    writeSync (fd) {
      if (/nowrite/.test(fd)) {
        throw createErr('ENOWRITE')
      }
    },
    fsyncSync (fd) {
      if (/nofsync/.test(fd)) {
        throw createErr('ENOFSYNC')
      }
    },
    closeSync (fd) {
      closeSyncCalled++
    },
    chownSync (tmpfile, uid, gid) {
      if (/nochown/.test(tmpfile)) {
        throw createErr('ENOCHOWN')
      }
      if (/enosys/.test(tmpfile)) {
        throw createErr('ENOSYS')
      }
      if (/einval/.test(tmpfile)) {
        throw createErr('EINVAL')
      }
      if (/eperm/.test(tmpfile)) {
        throw createErr('EPERM')
      }
    },
    chmodSync (tmpfile, mode) {
      if (/nochmod/.test(tmpfile)) {
        throw createErr('ENOCHMOD')
      }
      if (/enosys/.test(tmpfile)) {
        throw createErr('ENOSYS')
      }
      if (/einval/.test(tmpfile)) {
        throw createErr('EINVAL')
      }
      if (/eperm/.test(tmpfile)) {
        throw createErr('EPERM')
      }
    },
    renameSync (tmpfile, filename) {
      if (/norename/.test(tmpfile)) {
        throw createErr('ENORENAME')
      }
    },
    unlinkSync (tmpfile) {
      if (/nounlink/.test(tmpfile)) {
        throw createErr('ENOUNLINK')
      }
      unlinked.push(tmpfile)
    },
    statSync (tmpfile) {
      if (/nostat/.test(tmpfile)) {
        throw createErr('ENOSTAT')
      }
    },
  },
})
const writeFileAtomicSync = writeFileAtomic.sync

t.test('getTmpname', t => {
  const getTmpname = writeFileAtomic._getTmpname
  const a = getTmpname('abc.def')
  const b = getTmpname('abc.def')
  t.not(a, b, 'different invocations of getTmpname get different results')
  t.end()
})

t.test('cleanupOnExit', t => {
  const file = 'tmpname'
  unlinked = []
  const cleanup = writeFileAtomic._cleanupOnExit(() => file)
  cleanup()
  t.strictSame(unlinked, [file], 'cleanup code unlinks')
  const cleanup2 = writeFileAtomic._cleanupOnExit('nounlink')
  t.doesNotThrow(cleanup2, 'exceptions are caught')
  unlinked = []
  t.end()
})

t.test('async tests', t => {
  t.plan(2)

  expectClose = 0
  closeCalled = 0
  t.teardown(() => {
    t.parent.equal(closeCalled, expectClose, 'async tests closed all files')
    expectClose = 0
    closeCalled = 0
  })

  t.test('non-root tests', t => {
    t.plan(19)

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
      t.equal(err && err.message, 'ENOOPEN', 'fs.open failures propagate')
    })
    writeFileAtomic('nowrite', 'test', err => {
      t.equal(err && err.message, 'ENOWRITE', 'fs.writewrite failures propagate')
    })
    writeFileAtomic('nowrite', Buffer.from('test', 'utf8'), err => {
      t.equal(err && err.message, 'ENOWRITE', 'fs.writewrite failures propagate for buffers')
    })
    writeFileAtomic('nochown', 'test', { chown: { uid: 100, gid: 100 } }, err => {
      t.equal(err && err.message, 'ENOCHOWN', 'Chown failures propagate')
    })
    writeFileAtomic('nochown', 'test', err => {
      t.notOk(err, 'No attempt to chown when no uid/gid passed in')
    })
    writeFileAtomic('nochmod', 'test', { mode: parseInt('741', 8) }, err => {
      t.equal(err && err.message, 'ENOCHMOD', 'Chmod failures propagate')
    })
    writeFileAtomic('nofsyncopt', 'test', { fsync: false }, err => {
      t.notOk(err, 'fsync skipped if options.fsync is false')
    })
    writeFileAtomic('norename', 'test', err => {
      t.equal(err && err.message, 'ENORENAME', 'Rename errors propagate')
    })
    writeFileAtomic('norename nounlink', 'test', err => {
      t.equal(err && err.message, 'ENORENAME',
        'Failure to unlink the temp file does not clobber the original error')
    })
    writeFileAtomic('nofsync', 'test', err => {
      t.equal(err && err.message, 'ENOFSYNC', 'Fsync failures propagate')
    })
    writeFileAtomic('enosys', 'test', err => {
      t.notOk(err, 'No errors on ENOSYS')
    })
    writeFileAtomic('einval', 'test', { mode: 0o741 }, err => {
      t.notOk(err, 'No errors on EINVAL for non root')
    })
    writeFileAtomic('eperm', 'test', { mode: 0o741 }, err => {
      t.notOk(err, 'No errors on EPERM for non root')
    })
    writeFileAtomic('einval', 'test', { chown: { uid: 100, gid: 100 } }, err => {
      t.notOk(err, 'No errors on EINVAL for non root')
    })
    writeFileAtomic('eperm', 'test', { chown: { uid: 100, gid: 100 } }, err => {
      t.notOk(err, 'No errors on EPERM for non root')
    })
  })

  t.test('errors for root', t => {
    const { getuid } = process
    process.getuid = () => 0
    t.teardown(() => {
      process.getuid = getuid
    })
    t.plan(2)
    writeFileAtomic('einval', 'test', { chown: { uid: 100, gid: 100 } }, err => {
      t.match(err, { code: 'EINVAL' })
    })
    writeFileAtomic('einval', 'test', { mode: 0o741 }, err => {
      t.match(err, { code: 'EINVAL' })
    })
  })
})

t.test('sync tests', t => {
  t.plan(2)
  closeSyncCalled = 0
  expectCloseSync = 0
  t.teardown(() => {
    t.parent.equal(closeSyncCalled, expectCloseSync, 'sync closed all files')
    expectCloseSync = 0
    closeSyncCalled = 0
  })

  const throws = function (t, shouldthrow, msg, todo) {
    let err
    try {
      todo()
    } catch (e) {
      err = e
    }
    t.equal(shouldthrow, err && err.message, msg)
  }
  const noexception = function (t, msg, todo) {
    let err
    try {
      todo()
    } catch (e) {
      err = e
    }
    t.error(err, msg)
  }
  let tmpfile

  t.test('non-root', t => {
    t.plan(22)
    noexception(t, 'No errors occur when passing in options', () => {
      writeFileAtomicSync('good', 'test', { mode: '0777' })
    })
    noexception(t, 'No errors occur when passing in options as string', () => {
      writeFileAtomicSync('good', 'test', 'utf8')
    })
    noexception(t, 'No errors occur when NOT passing in options', () => {
      writeFileAtomicSync('good', 'test')
    })
    noexception(t, 'fsync never called if options.fsync is falsy', () => {
      writeFileAtomicSync('good', 'test', { fsync: false })
    })
    noexception(t, 'tmpfileCreated is called on success', () => {
      writeFileAtomicSync('good', 'test', {
        tmpfileCreated (gottmpfile) {
          tmpfile = gottmpfile
        },
      })
      t.match(tmpfile, /^good\.\d+$/, 'tmpfileCreated called for success')
    })

    tmpfile = undefined
    throws(t, 'ENOOPEN', 'fs.openSync failures propagate', () => {
      writeFileAtomicSync('noopen', 'test', {
        tmpfileCreated (gottmpfile) {
          tmpfile = gottmpfile
        },
      })
    })
    t.equal(tmpfile, undefined, 'tmpfileCreated not called for open failure')

    throws(t, 'ENOWRITE', 'fs.writeSync failures propagate', () => {
      writeFileAtomicSync('nowrite', 'test', {
        tmpfileCreated (gottmpfile) {
          tmpfile = gottmpfile
        },
      })
    })
    t.match(tmpfile, /^nowrite\.\d+$/, 'tmpfileCreated called for failure after open')

    throws(t, 'ENOCHOWN', 'Chown failures propagate', () => {
      writeFileAtomicSync('nochown', 'test', { chown: { uid: 100, gid: 100 } })
    })
    noexception(t, 'No attempt to chown when false passed in', () => {
      writeFileAtomicSync('nochown', 'test', { chown: false })
    })
    noexception(t, 'No errors occured when chown is undefined and original file owner used', () => {
      writeFileAtomicSync('chowncopy', 'test', { chown: undefined })
    })
    throws(t, 'ENORENAME', 'Rename errors propagate', () => {
      writeFileAtomicSync('norename', 'test')
    })
    throws(t, 'ENORENAME',
      'Failure to unlink the temp file does not clobber the original error', () => {
        writeFileAtomicSync('norename nounlink', 'test')
      })
    throws(t, 'ENOFSYNC', 'Fsync errors propagate', () => {
      writeFileAtomicSync('nofsync', 'test')
    })
    noexception(t, 'No errors on ENOSYS', () => {
      writeFileAtomicSync('enosys', 'test', { chown: { uid: 100, gid: 100 } })
    })
    noexception(t, 'No errors on EINVAL for non root', () => {
      writeFileAtomicSync('einval', 'test', { chown: { uid: 100, gid: 100 } })
    })
    noexception(t, 'No errors on EPERM for non root', () => {
      writeFileAtomicSync('eperm', 'test', { chown: { uid: 100, gid: 100 } })
    })

    throws(t, 'ENOCHMOD', 'Chmod failures propagate', () => {
      writeFileAtomicSync('nochmod', 'test', { mode: 0o741 })
    })
    noexception(t, 'No errors on EPERM for non root', () => {
      writeFileAtomicSync('eperm', 'test', { mode: 0o741 })
    })
    noexception(t, 'No attempt to chmod when no mode provided', () => {
      writeFileAtomicSync('nochmod', 'test', { mode: false })
    })
  })

  t.test('errors for root', t => {
    const { getuid } = process
    process.getuid = () => 0
    t.teardown(() => {
      process.getuid = getuid
    })
    t.plan(2)
    throws(t, 'EINVAL', 'Chown error as root user', () => {
      writeFileAtomicSync('einval', 'test', { chown: { uid: 100, gid: 100 } })
    })
    throws(t, 'EINVAL', 'Chmod error as root user', () => {
      writeFileAtomicSync('einval', 'test', { mode: 0o741 })
    })
  })
})

t.test('promises', async t => {
  let tmpfile
  closeCalled = 0
  expectClose = 0
  t.teardown(() => {
    t.parent.equal(closeCalled, expectClose, 'promises closed all files')
    closeCalled = 0
    expectClose = 0
  })

  await writeFileAtomic('good', 'test', {
    tmpfileCreated (gottmpfile) {
      tmpfile = gottmpfile
    },
  })
  t.match(tmpfile, /^good\.\d+$/, 'tmpfileCreated is called for success')

  await writeFileAtomic('good', 'test', {
    tmpfileCreated (gottmpfile) {
      return Promise.resolve()
    },
  })

  await t.rejects(writeFileAtomic('good', 'test', {
    tmpfileCreated () {
      return Promise.reject(new Error('reject from tmpfileCreated'))
    },
  }))

  await t.rejects(writeFileAtomic('good', 'test', {
    tmpfileCreated () {
      throw new Error('throw from tmpfileCreated')
    },
  }))

  tmpfile = undefined
  await t.rejects(writeFileAtomic('noopen', 'test', {
    tmpfileCreated (gottmpfile) {
      tmpfile = gottmpfile
    },
  }))
  t.equal(tmpfile, undefined, 'tmpfileCreated is not called on open failure')

  await t.rejects(writeFileAtomic('nowrite', 'test', {
    tmpfileCreated (gottmpfile) {
      tmpfile = gottmpfile
    },
  }))
  t.match(tmpfile, /^nowrite\.\d+$/, 'tmpfileCreated is called if failure is after open')
})
