var test = require('tape')
var Observ = require('observ')
var ObservAudioBuffer = require('../audio-buffer.js')
var path = require('path')

test(function(t){

  var audioContext = new AudioContext()
  var projectEvents = []
  var projectRoot = '/root'
  var context = window.context = {

    audio: audioContext,

    // stub project for sample loading via loop-drop-project/audio-buffer
    cwd: '/root/setup',
    project: { 
      getFile: function(src, type){

        projectEvents.push('getFile')

        var obs = Observ()

        if (src === 'setup/test.wav'){
          requestArrayBuffer('/sounds/test.wav', function(err, buffer){
            projectEvents.push('set')
            obs.set(buffer)
          })
        }

        obs.path = this.resolve(src)
        obs.src = src

        obs.onClose = function(listener){}
        obs.close = function(listener){ 
          obs.onClose()
          projectEvents.push('close')
        }

        return obs
      },

      checkExists: function(src, cb){
        projectEvents.push('checkExists')

        process.nextTick(function(){
          if (src === 'setup/test.wav'){
            cb(null, true)
          } else {
            cb(null, false)
          }
        })
      },

      resolve: function(paths){
        return path.resolve.apply(path, [projectRoot].concat(paths))
      },

      relative: function(fullPath){
        return path.relative(projectRoot, fullPath)
      }
    }
  }

  var node = ObservAudioBuffer(context)
  node.set({src: 'test.wav'})

  t.deepEqual(projectEvents, ['checkExists']); projectEvents.length = 0

  var removeListener = node.resolved(function(audioBuffer){
    if (audioBuffer){
      removeListener()

      t.deepEqual(projectEvents, ['getFile', 'set']); projectEvents.length = 0
      t.ok(audioBuffer instanceof AudioBuffer, 'instance of AudioBuffer')

      var node2 = ObservAudioBuffer(context)
      node2.set({src: 'test.wav'})
      t.equal(projectEvents.length, 0)
      t.equal(node2.resolved(), audioBuffer)
      
      node2.set({src: 'test2.wav'})
      t.deepEqual(projectEvents, ['checkExists']); projectEvents.length = 0

      process.nextTick(function(){ // wait for fake checkExists
        node.destroy()
        t.deepEqual(projectEvents, ['close'])
        t.end()
      })

    }
  })

})

function requestArrayBuffer(url, cb){
  var request = new window.XMLHttpRequest();
  request.open('GET', url, true);
  request.responseType = 'arraybuffer';
  request.onload = function() {
    cb(null, request.response)
  }
  request.onerror = cb
  request.send();
}