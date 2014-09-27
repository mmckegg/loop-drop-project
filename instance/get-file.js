var nextTick = require('next-tick')
var Observ = require('observ')

function getFile(src, cb){

  if (!(typeof src === 'string' && typeof cb === 'function')){
    throw 'Must specify src and callback'
  }

  var fs = this.fs
  var project = this
  var state = this._state
  var path = this.resolve(src)

  if (state.fileCache[path]){
    if (Array.isArray(state.fileCache[path])){
      state.fileCache[path].push(cb)
    } else {
      nextTick(function(){
        cb(null, state.fileCache[path])
      })
    }
  } else {
    var callbacks = state.fileCache[path] = [cb]
    fs.readFile(path, 'utf8', function(err, data){
      if (!err){
        var file = state.fileCache[path] = Observ(data)
        file.src = src
        file.delete = _deleteHandler.bind(project, file)

        var removeListener = file(function(data){
          if (file.src){
            data = data || '\n' // can't store 0 length values in level-fs :(
            fs.writeFile(project.resolve(file.src), data)
          }
        })

        state.lookupFileListeners[path] = removeListener
        state.removeFileListeners.push(removeListener)

        callbacks.forEach(function(callback){
          callback(null, file)
        })
      } else {
        callbacks.forEach(function(callback){
          callback(err)
        })
      }
    })
  }
}

function _deleteHandler(file){
  var fs = this.fs
  var state = this._state
  var path = this.resolve(file.src)

  var removeListener = state.lookupFileListeners[path]
  if (removeListener){

    removeListener()
    var index = state.removeFileListeners.indexOf(removeListener)
    if (~index){
      state.removeFileListeners.splice(index, 1)
    }

    fs.unlink(path, this.refreshEntries)
    file.src = null
    file.set(null)
  }
}

module.exports = getFile