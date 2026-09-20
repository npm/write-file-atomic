'use strict'
const fs = require('fs')
const path = require('path')
const t = require('tap')

const workdir = path.join(__dirname, path.basename(__filename, '.js'))
let testfiles = 0
function tmpFile () {
  return path.join(workdir, 'test-' + (++testfiles))
}

function createErr (code, message) {
  return Object.assign(new Error(message || code), { code })
}

function load (t, fsOverrides) {
  return t.mock('..', {
    fs: Object.assign({}, fs, fsOverrides),
  })
}

function leftoverTmp (dest) {
  const prefix = path.basename(dest) + '.'
  return fs.readdirSync(path.dirname(dest))
    .filter(name => name.startsWith(prefix))
}

t.test('setup', t => {
  fs.rmSync(workdir, { recursive: true, force: true })
  fs.mkdirSync(workdir, { recursive: true })
  t.end()
})

t.test('writeFileSync falls back to copy+unlink on EXDEV', t => {
  const dest = tmpFile()
  let copied = false
  const writeFileAtomic = load(t, {
    renameSync () {
      throw createErr('EXDEV', 'cross-device link not permitted')
    },
    copyFileSync (src, destPath) {
      copied = true
      return fs.copyFileSync(src, destPath)
    },
  })

  writeFileAtomic.sync(dest, 'hello-sync')
  t.equal(fs.readFileSync(dest, 'utf8'), 'hello-sync')
  t.equal(copied, true, 'used copyFileSync fallback')
  t.same(leftoverTmp(dest), [], 'tmpfile removed after copy')
  t.end()
})

t.test('writeFileSync EXDEV fallback replaces an existing file', t => {
  const dest = tmpFile()
  fs.writeFileSync(dest, 'old')
  const writeFileAtomic = load(t, {
    renameSync () {
      throw createErr('EXDEV', 'cross-device link not permitted')
    },
  })

  writeFileAtomic.sync(dest, 'new')
  t.equal(fs.readFileSync(dest, 'utf8'), 'new')
  t.same(leftoverTmp(dest), [], 'tmpfile removed after replacing dest')
  t.end()
})

t.test('writeFileSync still throws non-EXDEV rename errors', t => {
  const dest = tmpFile()
  const writeFileAtomic = load(t, {
    renameSync () {
      throw createErr('EPERM', 'operation not permitted')
    },
    copyFileSync () {
      t.fail('copyFileSync should not run for non-EXDEV rename errors')
    },
  })

  t.throws(() => writeFileAtomic.sync(dest, 'nope'), { code: 'EPERM' })
  t.throws(() => fs.readFileSync(dest), { code: 'ENOENT' }, 'dest not created')
  t.end()
})

t.test('writeFileSync propagates copyFile failure after EXDEV', t => {
  const dest = tmpFile()
  const writeFileAtomic = load(t, {
    renameSync () {
      throw createErr('EXDEV', 'cross-device link not permitted')
    },
    copyFileSync () {
      throw createErr('ENOCOPY', 'copy failed')
    },
  })

  t.throws(() => writeFileAtomic.sync(dest, 'nope'), { code: 'ENOCOPY' })
  t.throws(() => fs.readFileSync(dest), { code: 'ENOENT' }, 'dest not created')
  t.end()
})

t.test('writeFileSync succeeds when unlink after copy fails', t => {
  const dest = tmpFile()
  const writeFileAtomic = load(t, {
    renameSync () {
      throw createErr('EXDEV', 'cross-device link not permitted')
    },
    unlinkSync (filename) {
      if (filename === dest) {
        return fs.unlinkSync(filename)
      }
      throw createErr('ENOUNLINK', 'unlink failed')
    },
  })

  writeFileAtomic.sync(dest, 'kept')
  t.equal(fs.readFileSync(dest, 'utf8'), 'kept')
  t.end()
})

t.test('writeFile falls back to copy on EXDEV', async t => {
  const dest = tmpFile()
  let copied = false
  const writeFileAtomic = load(t, {
    rename (src, destPath, cb) {
      cb(createErr('EXDEV', 'cross-device link not permitted'))
    },
    copyFile (src, destPath, cb) {
      copied = true
      fs.copyFile(src, destPath, cb)
    },
  })

  await writeFileAtomic(dest, 'hello-async')
  t.equal(fs.readFileSync(dest, 'utf8'), 'hello-async')
  t.equal(copied, true, 'used copyFile fallback')
  t.same(leftoverTmp(dest), [], 'tmpfile removed after copy')
})

t.test('writeFile EXDEV fallback replaces an existing file', async t => {
  const dest = tmpFile()
  fs.writeFileSync(dest, 'old')
  const writeFileAtomic = load(t, {
    rename (src, destPath, cb) {
      cb(createErr('EXDEV', 'cross-device link not permitted'))
    },
  })

  await writeFileAtomic(dest, 'new')
  t.equal(fs.readFileSync(dest, 'utf8'), 'new')
  t.same(leftoverTmp(dest), [], 'tmpfile removed after replacing dest')
})

t.test('writeFile still rejects non-EXDEV rename errors', async t => {
  const dest = tmpFile()
  const writeFileAtomic = load(t, {
    rename (src, destPath, cb) {
      cb(createErr('EPERM', 'operation not permitted'))
    },
    copyFile () {
      t.fail('copyFile should not run for non-EXDEV rename errors')
    },
  })

  await t.rejects(writeFileAtomic(dest, 'nope'), { code: 'EPERM' })
  t.throws(() => fs.readFileSync(dest), { code: 'ENOENT' }, 'dest not created')
})

t.test('writeFile propagates copyFile failure after EXDEV', async t => {
  const dest = tmpFile()
  const writeFileAtomic = load(t, {
    rename (src, destPath, cb) {
      cb(createErr('EXDEV', 'cross-device link not permitted'))
    },
    copyFile (src, destPath, cb) {
      cb(createErr('ENOCOPY', 'copy failed'))
    },
  })

  await t.rejects(writeFileAtomic(dest, 'nope'), { code: 'ENOCOPY' })
  t.throws(() => fs.readFileSync(dest), { code: 'ENOENT' }, 'dest not created')
})

t.test('cleanup', t => {
  fs.rmSync(workdir, { recursive: true, force: true })
  t.end()
})
