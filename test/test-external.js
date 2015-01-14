var test = require('tape')
var Observ = require('observ')
var ObservStruct = require('observ-struct')
var ObservFileObject = require('../file-object.js')
var ObservExternal = require('../external.js')
var NodeArray = require('observ-node-array')

var path = require('path')

test('ObservExternal', function(t){

  var projectEvents = []
  var projectRoot = '/root'
  var context = {
    nodes: {
      setup: function Setup(context){
        var obs = ObservStruct({
          value: Observ(),
          chunks: NodeArray(context)
        })
        obs.type = 'Setup'
        return obs
      },
      chunk: function Chunk(context){
        var obs = ObservStruct({
          value: Observ(),
          overrideValue: Observ()
        })
        obs.type = 'Chunk'
        return obs
      },
      external: ObservExternal
    },

    project: { 
      getFile: function(src){

        // expand cwd
        src = this.relative(this.resolve(src))

        projectEvents.push('getFile')

        var obs = Observ()

        process.nextTick(function(){
          if (src === 'setup/index.json'){
            obs.set(JSON.stringify({
              node: 'setup',
              value: 'something',
              chunks: [
                { node: 'external',
                  overrideValue: 'bar',
                  src: './chunk.json'
                }
              ]
            }))
          } else if (src === 'setup/chunk.json'){
            obs.set(JSON.stringify({
              node: 'chunk',
              value: 'foo'
            }))
          } else if (src === 'setup/chunk2.json'){
            obs.set(JSON.stringify({
              node: 'chunk',
              value: 'different'
            }))
          }
        })

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
        process.nextTick(function(){
          cb(null, true)
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

    setTimeout(function(){ // wait for externals to load

      var external = fileObject.node.chunks.get(0)
      var chunk = external.inner

      t.deepEqual(external.resolved(), {
        node: 'chunk',
        value: 'foo',
        overrideValue: 'bar'
      })

      t.deepEqual(chunk(), external.resolved())
      t.equal(chunk.type, 'Chunk')

      var changes = []
      chunk(function(data){
        changes.push(data)
      })

      external.file.set(JSON.stringify({node: 'chunk', value: 'bar', overrideValue: 'foobar'}))
      t.deepEqual(changes, [
        {node: 'chunk', value: 'bar', overrideValue: 'bar'}
      ])

      changes.length = 0

      external.set({node: 'external', overrideValue: 'something else', src: './chunk.json'})
      t.deepEqual(changes, [
        {node: 'chunk', value: 'bar', overrideValue: 'something else'}
      ])

      external.set({node: 'external', overrideValue: 'value', src: './chunk2.json'})
      setTimeout(function(){
        t.deepEqual(external.inner(), {node: 'chunk', value: 'different', overrideValue: 'value'})
        t.end()
      }, 10)

    }, 10)
    
  })

})