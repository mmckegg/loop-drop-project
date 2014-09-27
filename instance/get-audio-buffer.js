var nextTick = require('next-tick')

function getAudioBuffer(src, cb){

  if (!(typeof src === 'string' && cb === 'function')){
    return cb('Must specify src and callback')
  }

  var fs = this.fs
  var project = this
  var state = this._state
  var path = this.resolve(src)

  if (state.audioBufferCache[path]){
    if (Array.isArray(state.audioBufferCache[path])){
      state.audioBufferCache[path].push(cb)
    } else {
      nextTick(function(){
        cb(null, state.audioBufferCache[path])
      })
    }
  } else {
    state.audioBufferCache[path] = [cb]
    fs.readFile(path, 'arraybuffer', function(err, buffer){
      project.decodeAudioData(buffer, function(audioBuffer){
        var callbacks = state.audioBufferCache[path]
        state.audioBufferCache[path] = audioBuffer
        callbacks.forEach(function(callback){
          callback(null, audioBuffer)
        })
      }, function(err){
        state.audioBufferCache[path] = null
        callbacks.forEach(function(callback){
          callback(err, null)
        })
      })
    })
  }

}

module.exports = getAudioBuffer