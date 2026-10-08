'use strict'
const fs = require('fs')
const path = require('path')
const crypto = require('node:crypto')
const t = require('tap')
const writeFileAtomic = require('..')

const workdir = path.join(__dirname, 'long-names')
fs.mkdirSync(workdir, { recursive: true })
t.teardown(() => fs.rmSync(workdir, { recursive: true, force: true }))
let cases = 0

function longFile (multibyte = false) {
  const directory = path.join(workdir, String(++cases))
  fs.mkdirSync(directory)
  let filename = path.join(directory, (multibyte ? 'é' : 'a').repeat(255))
  try {
    fs.writeFileSync(filename, 'original')
  } catch (err) {
    if (!multibyte || err.code !== 'ENAMETOOLONG') {
      throw err
    }
    // Some filesystems limit bytes, while others accept 255 Unicode characters.
    filename = path.join(directory, 'é'.repeat(127) + 'a')
    fs.writeFileSync(filename, 'original')
  }
  return filename
}

async function write (writer, sync, filename, data, options) {
  if (sync) {
    writer.sync(filename, data, options)
  } else {
    await writer(filename, data, options)
  }
}

for (const sync of [false, true]) {
  const mode = sync ? 'sync' : 'async'
  for (const multibyte of [false, true]) {
    for (const existing of [false, true]) {
      t.test(`long ${multibyte ? 'Unicode' : 'ASCII'} filename (${mode}, ${existing ? 'existing' : 'new'})`, async t => {
        const filename = longFile(multibyte)
        fs.chmodSync(filename, 0o640)
        const before = fs.statSync(filename)
        if (!existing) {
          fs.unlinkSync(filename)
        }
        let tmpfile
        await write(writeFileAtomic, sync, filename, 'replacement', {
          ...(existing ? {} : { mode: 0o640, chown: false }),
          tmpfileCreated (created) {
            tmpfile = created
            t.ok(fs.existsSync(created), 'callback sees the created temporary file')
          },
        })
        t.equal(fs.readFileSync(filename, 'utf8'), 'replacement')
        t.equal(path.dirname(tmpfile), path.dirname(filename), 'temporary file stays on the same filesystem')
        t.equal(Buffer.byteLength(path.basename(tmpfile)), 13, 'short temporary basename')
        const after = fs.statSync(filename)
        t.equal(after.mode & 0o777, 0o640, 'mode is preserved or explicitly applied')
        t.equal(after.uid, before.uid, 'owner is preserved')
        t.equal(after.gid, before.gid, 'group is preserved')
        t.same(fs.readdirSync(path.dirname(filename)), [path.basename(filename)], 'temporary file was renamed')
      })
    }
  }

  t.test(`new long filename uses default permissions (${mode})`, async t => {
    const filename = longFile()
    const before = fs.statSync(filename)
    fs.unlinkSync(filename)
    await write(writeFileAtomic, sync, filename, 'replacement')
    t.equal(fs.readFileSync(filename, 'utf8'), 'replacement')
    t.equal(fs.statSync(filename).mode & 0o777, before.mode & 0o777, 'default mode respects the umask')
    t.same(fs.readdirSync(path.dirname(filename)), [path.basename(filename)])
  })

  t.test(`long symlink target (${mode})`, async t => {
    const filename = longFile()
    const link = path.join(path.dirname(filename), 'link')
    fs.symlinkSync(filename, link)
    await write(writeFileAtomic, sync, link, 'replacement')
    t.ok(fs.lstatSync(link).isSymbolicLink(), 'symlink remains intact')
    t.equal(fs.readFileSync(filename, 'utf8'), 'replacement')
    t.equal(fs.readFileSync(link, 'utf8'), 'replacement')
    t.same(fs.readdirSync(path.dirname(filename)).sort(), [path.basename(filename), 'link'].sort())
  })

  t.test(`callback failure cleans short temporary file (${mode})`, async t => {
    const filename = longFile()
    const error = new Error('callback failed')
    let tmpfile
    await t.rejects(write(writeFileAtomic, sync, filename, 'replacement', {
      tmpfileCreated (created) {
        tmpfile = created
        throw error
      },
    }), error)
    t.ok(tmpfile, 'callback ran after creating the temporary file')
    t.notOk(tmpfile && fs.existsSync(tmpfile), 'failed temporary file was removed')
    t.equal(fs.readFileSync(filename, 'utf8'), 'original', 'destination was preserved')
    t.same(fs.readdirSync(path.dirname(filename)), [path.basename(filename)])
  })

  t.test(`short temporary collision does not overwrite another file (${mode})`, async t => {
    const filename = longFile()
    const collision = path.join(path.dirname(filename), '.' + '11'.repeat(6))
    fs.writeFileSync(collision, 'another writer')
    let attempts = 0
    const writer = t.mock('..', {
      'node:crypto': {
        ...crypto,
        randomBytes (size) {
          return Buffer.alloc(size, ++attempts === 1 ? 0x11 : 0x22)
        },
      },
    })
    await write(writer, sync, filename, 'replacement')
    t.equal(attempts, 2, 'retried the exclusive open after a collision')
    t.equal(fs.readFileSync(collision, 'utf8'), 'another writer',
      'colliding file was not truncated or removed')
    t.equal(fs.readFileSync(filename, 'utf8'), 'replacement')
    t.same(fs.readdirSync(path.dirname(filename)).sort(),
      [path.basename(filename), path.basename(collision)].sort())
  })

  t.test(`short temporary cleanup failure preserves the original error (${mode})`, async t => {
    const filename = longFile()
    const error = new Error('callback failed')
    const cleanupError = Object.assign(new Error('cleanup failed'), { code: 'EACCES' })
    const writer = t.mock('..', {
      fs: {
        ...fs,
        unlink (name, callback) {
          callback(cleanupError)
        },
        unlinkSync () {
          throw cleanupError
        },
      },
    })
    let tmpfile
    await t.rejects(write(writer, sync, filename, 'replacement', {
      tmpfileCreated (created) {
        tmpfile = created
        throw error
      },
    }), error)
    t.ok(tmpfile && fs.existsSync(tmpfile), 'temporary file remains when unlink fails')
    t.equal(fs.readFileSync(filename, 'utf8'), 'original', 'destination was preserved')
  })

  for (const code of ['EACCES', 'ENAMETOOLONG']) {
    t.test(`short temporary ${code} is propagated (${mode})`, async t => {
      const filename = longFile()
      let attempts = 0
      const error = Object.assign(new Error(code), { code })
      const writer = t.mock('..', {
        fs: {
          ...fs,
          open (name, flags, permissions, callback) {
            if (flags === 'wx') {
              attempts++
              return callback(error)
            }
            return fs.open(name, flags, permissions, callback)
          },
          openSync (name, flags, permissions) {
            if (flags === 'wx') {
              attempts++
              throw error
            }
            return fs.openSync(name, flags, permissions)
          },
        },
      })
      await t.rejects(write(writer, sync, filename, 'replacement'), error)
      t.equal(attempts, 1, 'fallback was attempted once')
      t.equal(fs.readFileSync(filename, 'utf8'), 'original', 'destination was preserved')
      t.same(fs.readdirSync(path.dirname(filename)), [path.basename(filename)])
    })
  }
}
