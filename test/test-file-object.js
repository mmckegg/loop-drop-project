var test = require('tape')
var Observ = require('observ')
var ObservStruct = require('observ-struct')
var ObservFileObject = require('../file-object.js')
var path = require('path')

test('ObservFileObject', function(t){

  var projectEvents = []
  var projectRoot = '/root'
  var context = {
    cwd: '/root/setup',

    nodes: {
      setup: function Setup(){
        var obs = ObservStruct({
          value: Observ()
        })
        obs.type = 'Setup'
        return obs
      }
    },

    project: { 
      getFile: function(src){

        projectEvents.push('getFile')

        var obs = Observ()

        if (src === 'setup/index.json'){
          process.nextTick(function(){
            obs.set(JSON.stringify({
              node: 'setup',
              value: 'something'
            }))
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
          if (src === 'setup/index.json'){
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

  var fileObject = ObservFileObject(context)
  fileObject.load('setup/index.json')
  fileObject.onLoad(function(){
    t.deepEqual(projectEvents, ['getFile']); projectEvents.length = 0
    t.equal(fileObject.node.type, 'Setup')

    var changes = []
    fileObject.file(function(change){
      changes.push(change)
    })

    fileObject.node.value.set('another')

    t.deepEqual(changes, [
      JSON.stringify({node: 'setup', value: 'another'})
    ])

    var valueChanges = []
    fileObject.node.value(function(data){
      valueChanges.push(data)
    })

    fileObject.file.set(JSON.stringify({node: 'setup', value: 'from file'}))

    t.deepEqual(valueChanges, ['from file'])

    fileObject.close()
    t.deepEqual(projectEvents, ['close']); projectEvents.length = 0

    t.end()
  })

})