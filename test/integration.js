'use strict'
var test = require('tap').test
var writeFileAtomic = require('../index')
var fs = require('fs')
var tmp = require('tmp')

function tmpPath () {
  // We need to manually set os temp dir because of:
  // https://github.com/npm/npm/issues/4531#issuecomment-226294103
  var dir = tmp.dirSync({ dir: '/tmp' }).name
  return tmp.tmpNameSync({ dir: dir })
}

function readFile (path) {
  return fs.readFileSync(path).toString()
}

test('writes simple file (async)', function (t) {
  t.plan(1)
  var path = tmpPath()
  writeFileAtomic(path, '42', function (err) {
    if (err) throw err
    t.is(readFile(path), '42')
  })
})

test('runs chown on given file (async)', function (t) {
  t.plan(2)
  var path = tmpPath()
  writeFileAtomic(path, '42', { chown: { uid: 42, gid: 43 } }, function (err) {
    if (err) throw err
    var stat = fs.statSync(path)
    t.is(stat.uid, 42)
    t.is(stat.gid, 43)
  })
})

test('runs chmod on given file (async)', function (t) {
  t.plan(1)
  var path = tmpPath()
  writeFileAtomic(path, '42', { mode: parseInt('741', 8) }, function (err) {
    if (err) throw err
    var stat = fs.statSync(path)
    t.is(stat.mode, parseInt('100741', 8))
  })
})

test('does not change chmod by default (async)', function (t) {
  t.plan(1)
  var path = tmpPath()
  writeFileAtomic(path, '42', { mode: parseInt('741', 8) }, function (err) {
    if (err) throw err

    writeFileAtomic(path, '43', function (err) {
      if (err) throw err
      var stat = fs.statSync(path)
      t.is(stat.mode, parseInt('100741', 8))
    })
  })
})

test('does not change chown by default (async)', function (t) {
  t.plan(2)
  var path = tmpPath()
  writeFileAtomic(path, '42', { chown: { uid: 42, gid: 43 } }, function (err) {
    if (err) throw err

    writeFileAtomic(path, '43', function (err) {
      if (err) throw err
      var stat = fs.statSync(path)
      t.is(stat.uid, 42)
      t.is(stat.gid, 43)
    })
  })
})

test('writes simple file (sync)', function (t) {
  t.plan(1)
  var path = tmpPath()
  writeFileAtomic.sync(path, '42')
  t.is(readFile(path), '42')
})

test('runs chown on given file (sync)', function (t) {
  t.plan(2)
  var path = tmpPath()
  writeFileAtomic.sync(path, '42', { chown: { uid: 42, gid: 43 } })
  var stat = fs.statSync(path)
  t.is(stat.uid, 42)
  t.is(stat.gid, 43)
})

test('runs chmod on given file (sync)', function (t) {
  t.plan(1)
  var path = tmpPath()
  writeFileAtomic.sync(path, '42', { mode: parseInt('741', 8) })
  var stat = fs.statSync(path)
  t.is(stat.mode, parseInt('100741', 8))
})

test('does not change chmod by default (sync)', function (t) {
  t.plan(1)
  var path = tmpPath()
  writeFileAtomic.sync(path, '42', { mode: parseInt('741', 8) })
  writeFileAtomic.sync(path, '43')
  var stat = fs.statSync(path)
  t.is(stat.mode, parseInt('100741', 8))
})

test('does not change chown by default (sync)', function (t) {
  t.plan(2)
  var path = tmpPath()
  writeFileAtomic.sync(path, '42', { chown: { uid: 42, gid: 43 } })
  writeFileAtomic.sync(path, '43')
  var stat = fs.statSync(path)
  t.is(stat.uid, 42)
  t.is(stat.gid, 43)
})
