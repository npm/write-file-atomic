'use strict'
const fs = require('fs')
const path = require('path')
const t = require('tap')
const mkdirp = require('mkdirp')
const rimraf = require('rimraf')

const workdir = path.join(__dirname, path.basename(__filename, '.js'))
let testfiles = 0
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
  if (!options) {
    options = {}
  }
  const actual = {}
  const writeFileAtomic = t.mock('..', {
    fs: Object.assign({}, fs, {
      chown (filename, uid, gid, cb) {
        actual.uid = uid
        actual.gid = gid
        process.nextTick(cb)
      },
      stat (filename, cb) {
        fs.stat(filename, (err, stats) => {
          if (err) {
            return cb(err)
          }
          cb(null, Object.assign(stats, expected || {}))
        })
      },
    }),
  })
  return writeFileAtomic(filename, data, options, err => {
    t.strictSame(actual, expected, 'ownership is as expected')
    callback(err)
  })
}

function didWriteFileAtomicSync (t, expected, filename, data, options) {
  const actual = {}
  const writeFileAtomic = t.mock('..', {
    fs: Object.assign({}, fs, {
      chownSync (filename, uid, gid) {
        actual.uid = uid
        actual.gid = gid
      },
      statSync (filename) {
        const stats = fs.statSync(filename)
        return Object.assign(stats, expected || {})
      },
    }),
  })
  writeFileAtomic.sync(filename, data, options)
  t.strictSame(actual, expected)
}

function currentUser () {
  return {
    uid: process.getuid(),
    gid: process.getgid(),
  }
}

t.test('setup', t => {
  rimraf.sync(workdir)
  mkdirp.sync(workdir)
  t.end()
})

t.test('writes simple file (async)', t => {
  t.plan(3)
  const file = tmpFile()
  didWriteFileAtomic(t, {}, file, '42', err => {
    t.error(err, 'no error')
    t.equal(readFile(file), '42', 'content ok')
  })
})

t.test('writes simple file with encoding (async)', t => {
  t.plan(3)
  const file = tmpFile()
  didWriteFileAtomic(t, {}, file, 'foo', 'utf16le', err => {
    t.error(err, 'no error')
    t.equal(readFile(file), 'f\u0000o\u0000o\u0000', 'content ok')
  })
})

t.test('writes buffers to simple file (async)', t => {
  t.plan(3)
  const file = tmpFile()
  didWriteFileAtomic(t, {}, file, Buffer.from('42'), err => {
    t.error(err, 'no error')
    t.equal(readFile(file), '42', 'content ok')
  })
})

t.test('writes TypedArray to simple file (async)', t => {
  t.plan(3)
  const file = tmpFile()
  didWriteFileAtomic(t, {}, file, new Uint8Array([0x34, 0x32]), err => {
    t.error(err, 'no error')
    t.equal(readFile(file), '42', 'content ok')
  })
})

t.test('writes undefined to simple file (async)', t => {
  t.plan(3)
  const file = tmpFile()
  didWriteFileAtomic(t, {}, file, undefined, err => {
    t.error(err, 'no error')
    t.equal(readFile(file), '', 'content ok')
  })
})

t.test('writes to symlinks without clobbering (async)', t => {
  t.plan(5)
  const file = tmpFile()
  const link = tmpFile()
  fs.writeFileSync(file, '42')
  fs.symlinkSync(file, link)
  didWriteFileAtomic(t, currentUser(), link, '43', err => {
    t.error(err, 'no error')
    t.equal(readFile(file), '43', 'target content ok')
    t.equal(readFile(link), '43', 'link content ok')
    t.ok(fs.lstatSync(link).isSymbolicLink(), 'link is link')
  })
})

t.test('runs chown on given file (async)', t => {
  const file = tmpFile()
  didWriteFileAtomic(t, { uid: 42, gid: 43 }, file, '42', { chown: { uid: 42, gid: 43 } }, err => {
    t.error(err, 'no error')
    t.equal(readFile(file), '42', 'content ok')
    t.end()
  })
})

t.test('writes simple file with no chown (async)', t => {
  t.plan(3)
  const file = tmpFile()
  didWriteFileAtomic(t, {}, file, '42', { chown: false }, err => {
    t.error(err, 'no error')
    t.equal(readFile(file), '42', 'content ok')
    t.end()
  })
})

t.test('runs chmod on given file (async)', t => {
  t.plan(5)
  const file = tmpFile()
  didWriteFileAtomic(t, {}, file, '42', { mode: parseInt('741', 8) }, err => {
    t.error(err, 'no error')
    const stat = fs.statSync(file)
    t.equal(stat.mode, parseInt('100741', 8))
    didWriteFileAtomic(t, { uid: 42, gid: 43 }, file, '23',
      { chown: { uid: 42, gid: 43 } }, err => {
        t.error(err, 'no error')
      })
  })
})

t.test('run chmod AND chown (async)', t => {
  t.plan(3)
  const file = tmpFile()
  didWriteFileAtomic(t, { uid: 42, gid: 43 }, file, '42',
    { mode: parseInt('741', 8), chown: { uid: 42, gid: 43 } }, err => {
      t.error(err, 'no error')
      const stat = fs.statSync(file)
      t.equal(stat.mode, parseInt('100741', 8))
    })
})

t.test('does not change chmod by default (async)', t => {
  t.plan(5)
  const file = tmpFile()
  didWriteFileAtomic(t, {}, file, '42', { mode: parseInt('741', 8) }, err => {
    t.error(err, 'no error')

    didWriteFileAtomic(t, currentUser(), file, '43', err => {
      t.error(err, 'no error')
      const stat = fs.statSync(file)
      t.equal(stat.mode, parseInt('100741', 8))
    })
  })
})

t.test('does not change chown by default (async)', t => {
  t.plan(6)
  const file = tmpFile()
  didWriteFileAtomic(t, { uid: 42, gid: 43 }, file, '42',
    { chown: { uid: 42, gid: 43 } }, _setModeOnly)

  function _setModeOnly (err) {
    t.error(err, 'no error')

    didWriteFileAtomic(t, { uid: 42, gid: 43 }, file, '43',
      { mode: parseInt('741', 8) }, _allDefault)
  }

  function _allDefault (err) {
    t.error(err, 'no error')

    didWriteFileAtomic(t, { uid: 42, gid: 43 }, file, '43', _noError)
  }

  function _noError (err) {
    t.error(err, 'no error')
  }
})

t.test('writes simple file (sync)', t => {
  t.plan(2)
  const file = tmpFile()
  didWriteFileAtomicSync(t, {}, file, '42')
  t.equal(readFile(file), '42')
})

t.test('writes simple file with encoding (sync)', t => {
  t.plan(2)
  const file = tmpFile()
  didWriteFileAtomicSync(t, {}, file, 'foo', 'utf16le')
  t.equal(readFile(file), 'f\u0000o\u0000o\u0000')
})

t.test('writes simple buffer file (sync)', t => {
  t.plan(2)
  const file = tmpFile()
  didWriteFileAtomicSync(t, {}, file, Buffer.from('42'))
  t.equal(readFile(file), '42')
})

t.test('writes simple TypedArray file (sync)', t => {
  t.plan(2)
  const file = tmpFile()
  didWriteFileAtomicSync(t, {}, file, new Uint8Array([0x34, 0x32]))
  t.equal(readFile(file), '42')
})

t.test('writes undefined file (sync)', t => {
  t.plan(2)
  const file = tmpFile()
  didWriteFileAtomicSync(t, {}, file, undefined)
  t.equal(readFile(file), '')
})

t.test('writes to symlinks without clobbering (sync)', t => {
  t.plan(4)
  const file = tmpFile()
  const link = tmpFile()
  fs.writeFileSync(file, '42')
  fs.symlinkSync(file, link)
  didWriteFileAtomicSync(t, currentUser(), link, '43')
  t.equal(readFile(file), '43', 'target content ok')
  t.equal(readFile(link), '43', 'link content ok')
  t.ok(fs.lstatSync(link).isSymbolicLink(), 'link is link')
})

t.test('runs chown on given file (sync)', t => {
  t.plan(1)
  const file = tmpFile()
  didWriteFileAtomicSync(t, { uid: 42, gid: 43 }, file, '42', { chown: { uid: 42, gid: 43 } })
})

t.test('runs chmod on given file (sync)', t => {
  t.plan(3)
  const file = tmpFile()
  didWriteFileAtomicSync(t, {}, file, '42', { mode: parseInt('741', 8) })
  const stat = fs.statSync(file)
  t.equal(stat.mode, parseInt('100741', 8))
  didWriteFileAtomicSync(t, { uid: 42, gid: 43 }, file, '23', { chown: { uid: 42, gid: 43 } })
})

t.test('runs chown and chmod (sync)', t => {
  t.plan(2)
  const file = tmpFile()
  didWriteFileAtomicSync(t, { uid: 42, gid: 43 }, file, '42',
    { mode: parseInt('741', 8), chown: { uid: 42, gid: 43 } })
  const stat = fs.statSync(file)
  t.equal(stat.mode, parseInt('100741', 8))
})

t.test('does not change chmod by default (sync)', t => {
  t.plan(3)
  const file = tmpFile()
  didWriteFileAtomicSync(t, {}, file, '42', { mode: parseInt('741', 8) })
  didWriteFileAtomicSync(t, currentUser(), file, '43')
  const stat = fs.statSync(file)
  t.equal(stat.mode, parseInt('100741', 8))
})

t.test('does not change chown by default (sync)', t => {
  t.plan(3)
  const file = tmpFile()
  didWriteFileAtomicSync(t, { uid: 42, gid: 43 }, file, '42', { chown: { uid: 42, gid: 43 } })
  didWriteFileAtomicSync(t, { uid: 42, gid: 43 }, file, '43', { mode: parseInt('741', 8) })
  didWriteFileAtomicSync(t, { uid: 42, gid: 43 }, file, '44')
})

t.test('cleanup', t => {
  rimraf.sync(workdir)
  t.end()
})
