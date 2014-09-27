var test = require('tape')
var doTest = require('./_do-test.js')
var fs = require('fs')
var join = require('path').join
var rimraf = require('rimraf')

test('node fs', function(t){
  var dirname = join(__dirname, 'test-project')
  rimraf(dirname, function(err){
    doTest(t, fs, dirname)
  })
})