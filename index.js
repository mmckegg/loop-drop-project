var ObservDirectory = require('observ-fs/directory')
var ObservFile = require('observ-fs/file')
var join = require('path').join
var map = require('map-async')
var relative = require('path').relative

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

  getFileBlob: function(src, cb){
    var project = this
    var state = project._state
    var path = project.resolve(src)
    state.fs.readFile(path, 'blob', cb)
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

  close: function(){
    var state = this._state
    var openItems = state.openDirectories.concat(state.openFiles)
    openItems.forEach(function(item){
      item.close()
    })
  }

}