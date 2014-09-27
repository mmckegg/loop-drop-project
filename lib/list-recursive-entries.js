var list = require('./list.js')
var map = require('map-async')
var relative = require('path').relative

function listRecursiveEntries(fs, projectDirectory, path, cb){
  list(fs, path, function(err, paths){
    if (err) return next(err)
    map(paths, function(value, key, next){
      fs.stat(value, function(err, stats){
        if (err) return next(err)
        if (stats.isDirectory()){
          var result = {
            type: 'directory',
            fileName: relative(path, value),
            path: relative(projectDirectory, value),
            entries: []
          }
          listRecursiveEntries(fs, projectDirectory, value, function(err, entries){
            if (err) return next(err)
            result.entries = entries
            next(null, result)
          })
        } else {
          next(null, {
            type: 'file',
            fileName: relative(path, value),
            path: relative(projectDirectory, value),
          })
        }
      })
    }, cb)
  })
}

module.exports = listRecursiveEntries