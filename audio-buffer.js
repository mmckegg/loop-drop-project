var Observ = require('observ')
var watch = require('observ/watch')
var Event = require('geval')

module.exports = ObservAudioBuffer

function ObservAudioBuffer(context){
  var obs = Observ({})
  obs.resolved = Observ()

  var releaseResolved = null
  var cache = sampleCache[context.audio.sampleRate] = sampleCache[context.audio.sampleRate] || {}
  var lastSrc = null

  var removeListener = obs(function(data){
    if (lastSrc !== data.src){
      lastSrc = data.src
      update(data.src)
    }
  })

  function update(src){
    var path = context.project.resolve([context.cwd||'', src])
    if (cache[path]){
      switchTo(cache[path])
    } else {
      var resolvedSrc = context.project.relative(path)
      context.project.checkExists(resolvedSrc, function(err, exists){
        if (exists){
          var file = context.project.getFile(resolvedSrc, 'arraybuffer')
          var parsedFile = computedAudioBuffer(context.audio, file)
          parsedFile.onReleaseAll(function(){ 
            file.close(); delete cache[path] 
          })
          cache[path] = parsedFile
          switchTo(parsedFile)
        } else {
          switchTo(null)
        }
      })
    }
  }

  function switchTo(target){
    if (releaseResolved){
      releaseResolved()
      releaseResolved = null
    }

    if (target){
      releaseResolved = watch(target, obs.resolved.set)
    } else {
      obs.resolved.set(null)
    }
  }

  obs.destroy = function(){
    releaseResolved()
    removeListener()
    obs.set(null)
  }

  return obs
}

var sampleCache = {}

function computedAudioBuffer(audioContext, file){
  var value = null
  var listeners = []
  var broadcastReleased = null

  function set(v){
    value = v
    for (var i=0;i<listeners.length;i++){
      listeners[i](value)
    }
  }

  watch(file, function(buffer){
    if (buffer){
      audioContext.decodeAudioData(buffer, function(audioBuffer) {
        set(audioBuffer)
      }, function(err){
        set(null)
      })
    } else {
      set(null)
    }
  })

  var obs = function(listener){
    if (!listener){
      return value
    }

    listeners.push(listener)
    return function remove(){
      var index = listeners.indexOf(listener)
      if (~index) listeners.splice(index, 1)
      if (!listeners.length){
        broadcastReleased()
      } 
    }

  }

  obs.onReleaseAll = Event(function(broadcast){
    broadcastReleased = broadcast
  })

  return obs
}