var Observ = require('observ')
var join = require('path').join
var list = require('./lib/list.js')
var listRecursiveEntries = require('./lib/list-recursive-entries.js')
var relative = require('path').relative

module.exports = Project

function Project(options){
  // options: fs, decodeAudioData

  if (!(this instanceof Project)){
    return new Project(options)
  }

  options = options || {}

  this._state = {
    rootDirectory: null,
    removeFileListeners: [],
    lookupFileListeners: {},
    fileCache: {},
    audioBufferCache: {}
  }

  this.fs = options.fs
  this.decodeAudioData = options.decodeAudioData || decodeFallback
  this.entries = Observ([])
  this.refreshEntries = _refreshEntries.bind(this)
}

Project.prototype = {
  
  load: function(rootDirectory, cb){
    var state = this._state

    // release project.getFile handlers
    state.removeFileListeners.forEach(invoke)
    state.removeFileListeners = []
    state.lookupFileListeners = {}
    state.fileCache = {}

    // clear audio cache
    state.audioBufferCache = {}

    // update root
    state.rootDirectory = rootDirectory
    this.refreshEntries(cb)
  },

  createDirectory: function(src, cb){
    var path = this.resolve(src)
    this.fs.mkdir(path, cb)
  },

  createFile: function(src, cb){
    var fs = this.fs
    var project = this
    var state = this._state
    var path = this.resolve(src)

    state.fileCache[path] = null
  
    var data = '\n' // can't store 0 length values in level-fs :(
      
    fs.writeFile(path, data, function(err){
      if (err) return cb&&cb(err)
      project.getFile(src, cb)
      project.refreshEntries()
    })
  },

  getFile: require('./instance/get-file.js'),
  getAudioBuffer: require('./instance/get-audio-buffer.js'),

  getFileBlob: function(src, cb){
    var path = this.resolve(src)
    fs.readFile(path, 'blob', cb)
  },

  list: function(src, cb){
    var state = this._state
    var path = this.resolve(src)
    list(this.fs, path, function(err, files){
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
  }

}

function _refreshEntries(cb){
  var project = this
  var state = this._state

  listRecursiveEntries(project.fs, state.rootDirectory, state.rootDirectory, function(err, entries){
    if (err) return cb&&cb(err)
    project.entries.set(entries)
    cb&&cb(null)
  })
}

function decodeFallback(data, cb){
  nextTick(function(){
    cb(null, data)
  })
}

function invoke(func){
  func()
}