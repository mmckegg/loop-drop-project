var join = require('path').join

function list(fs, path, cb){
  fs.readdir(path, function(err, files){
    if(err)return cb&&cb(err)
    cb(null, files.sort().map(function(file){
      return join(path, file)
    }))
  })
}

module.exports = list