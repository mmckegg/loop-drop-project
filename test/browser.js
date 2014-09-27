var test = require('tape')
var WebFS = require('web-fs')
var join = require('path').join
var levelFs = require('browserify-fs')
var doTest = require('./_do-test.js')

test('web fs', function testWebFs(t){
  navigator.webkitTemporaryStorage.requestQuota(1024*1024, function(grantedBytes) {
    window.webkitRequestFileSystem(TEMPORARY, grantedBytes, function(result){
      var path = join(result.root.fullPath, 'project-' + Date.now())
      doTest(t, WebFS(result.root), path)
    })
  })
})

test('level fs via indexedb', function testLevelFs(t){
  var path = '/project-' + Date.now()
  doTest(t, levelFs, path)
})