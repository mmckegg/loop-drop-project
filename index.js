var ObservDirectory = require('observ-fs/directory')
var ObservFile = require('observ-fs/file')
var join = require('path').join
var map = require('map-async')
var relative = require('path').relative
var getBaseName = require('path').basename
var getDirName = require('path').dirname
var getExt = require('path').extname

var list = require('./lib/list.js')

module.exports = Project

function Project(fs){
  // options: fs, decodeAudioData

  if (!(this instanceof Project)){
    return new Project(fs)
  }

  this._state = {
    rootDirectory: null,
    openDirectories: [],
    openFiles: [],
    fs: fs || null
  }
}

Project.prototype = {
  
  load: function(rootDirectory, fs, cb){
    if (typeof fs === 'function') return this.load(rootDirectory, null, fs)

    var project = this
    var state = project._state

    // clear audio cache
    state.audioBufferCache = {}

    // update fs instance
    state.fs = fs || state.fs

    // update root
    var oldRoot = state.rootDirectory
    state.rootDirectory = rootDirectory
    
    // reload open directories
    map(state.openDirectories, function(directory, i, next){
      var path = project.resolve(directory.src)
      directory.set(path, state.fs, next)
    }, cb)

  },

  createDirectory: function(src, cb){
    var project = this
    var state = project._state
    var path = project.resolve(src)

    // force refresh (in case of no watcher)
    state.fs.mkdir(path, function(err){
      if (err) return cb&&cb(err)
      map(state.openDirectories, function(directory, i, next){
        if (directory.path === path){
          directory.refresh(next)
        } else {
          next(null)
        }
      }, cb)
    })
  },

  getDirectory: function(src, cb){

    var project = this
    var state = project._state
    var path = state.rootDirectory ? project.resolve(src) : null
    var fs = state.fs

    var obs = ObservDirectory(path, fs, cb)
    obs.src = path ? project.relative(path) : join('.', src)
    state.openDirectories.push(obs)
    obs.onClose(function(){
      var index = state.openDirectories.indexOf(obs)
      if (~index){
        state.openDirectories.splice(index, 1)
      }
    })

    return obs
  },

  getFile: function(src, encoding, cb){
    if (typeof encoding === 'function') return this.getFile(src, null, encoding)

    var project = this
    var state = project._state
    var path = project.resolve(src)
    var fs = state.fs

    var obs = ObservFile(path, encoding, fs, cb)

    obs.src = project.relative(path)
    state.openFiles.push(obs)

    obs.onClose(function(){
      var index = state.openFiles.indexOf(obs)
      if (~index){
        state.openFiles.splice(index, 1)
      }
    })
    return obs
  },

  checkExists: function(src, cb){
    var state = this._state
    var fs = state.fs
    var path = this.resolve(src)
    fs.stat(path, function(err, stats){
      if (stats){
        cb(null, true)
      } else {
        cb(null, false)
      }
    })
  },

  resolveAvailable: function(src, cb){

    // check if file exists, 
    // if so increment number and try again, 
    // otherwise return src

    var project = this
    var ext = getExt(src)
    var base = getBaseName(src, ext)
    var dir = getDirName(src)
    var numberMatch = /(^.+) ([0-9]+)$/.exec(base)

    project.checkExists(src, function(err, exists){
      if (err) return cb&&cb(err)
      if (exists){
        if (numberMatch){
          var number = parseInt(numberMatch[2]) + 1
          var fileName = numberMatch[1] + ' ' + number + ext
          project.resolveAvailable(join(dir, fileName), cb)
        } else {
          var fileName = base + ' 1' + ext
          project.resolveAvailable(join(dir, fileName), cb)
        }
      } else {
        cb(null, src)
      }
    })
  },

  getFileBlob: function(src, cb){
    var project = this
    var state = project._state
    var path = project.resolve(src)
    state.fs.readFile(path, 'blob', cb)
  },

  writeFileBlob: function(src, file, cb){
    var project = this
    var state = project._state
    var path = project.resolve(src)
    state.fs.writeFile(path, file, cb)
  },

  list: function(src, cb){
    var state = this._state
    var path = this.resolve(src)
    list(state.fs, path, function(err, files){
      if(err)return cb&&cb(err)
      cb(null, files.map(function(file){
        return relative(state.rootDirectory, file)
      }))
    })
  },

  resolve: function(src){
    var state = this._state
    if (!state.rootDirectory){
      throw 'No project active. Use `project.load(rootDirectory)`'
    }
    return join(state.rootDirectory, src)
  },

  relative: function(path){
    var state = this._state
    if (!state.rootDirectory){
      throw 'No project active. Use `project.load(rootDirectory)`'
    }
    return relative(state.rootDirectory, path)
  },

  backup: function(file, cb){
    var project = this
    var state = project._state
    var fs = state.fs
    var path = file.path
    var src = file.path

    var backupDirectory = join(getDirName(path), 'backup')
    var backupFile = join(backupDirectory, getBaseName(path))

    fs.stat(backupDirectory, function(err, stats){
      if (err){
        fs.mkdir(backupDirectory, doBackup)
      } else if (stats.isDirectory()){
        doBackup()
      } else {
        cb&&cb('unknown file type')
      }
    })

    function doBackup(){
      fs.writeFile(backupFile, file(), cb)
    }

  },

  close: function(){
    var state = this._state
    var openItems = state.openDirectories.concat(state.openFiles)
    openItems.forEach(function(item){
      item.close()
    })
  }

}