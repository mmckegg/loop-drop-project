var resolveNode = require('observ-node-array/resolve')
var deepEqual = require('deep-equal')
var getDirName = require('path').dirname
var getBaseName = require('path').basename
var relative = require('path').relative

var Observ = require('observ')
var Event = require('geval')
var watch = require('observ/watch')
var NO_TRANSACTION = {}

module.exports = FileObject

function FileObject(parentContext){

  var context = Object.create(parentContext)

  var obs = Observ({})
  obs.file = null

  // add self to context
  context.fileObject = obs

  var parsedFile = null

  var loading = false
  var releaseFile = null
  var releaseInstance = null
  var currentTransaction = NO_TRANSACTION

  var lastData = {}
  obs.node = null

  obs(function(data){

    if (parsedFile && data === parsedFile()){
      // push update from file to object

      var oldNode = getNode(lastData)
      var newNode = getNode(data)
      var instance = obs.node
      var oldInstance = instance
     
      if (oldNode !== newNode){
        var ctor = resolveNode(context.nodes, newNode)

        if (instance){
          releaseInstance()
          instance.destroy && instance.destroy()
          instance = null
          obs.resolveNode = null
        }

        if (ctor){
          instance = obs.node = ctor(context)
          instance.nodeName = newNode
          releaseInstance = instance(function(data){
            if (currentTransaction === NO_TRANSACTION){
              obs.set(data)
            }
          })
          broadcastNode(instance)
        } else if (oldInstance){
          broadcastNode(null)
        }

      }

      if (instance){
        currentTransaction = data
        instance.set(data)
        currentTransaction = NO_TRANSACTION
      }

      lastData = data

      if (data && loading){
        loading = false
        broadcastLoaded() // hacky callback for onLoad
      }

    } else if (parsedFile && data !== parsedFile()){
      // push update to file

      var lastNode = getNode(lastData)
      if (lastNode){
        data[context.nodeKey||'node'] = lastNode
      }

      parsedFile.set(data)

    }
  })

  var broadcastLoaded = null
  obs.onLoad = Event(function(broadcast){
    broadcastLoaded = broadcast
  })

  var broadcastNode = null
  obs.onNode = Event(function(broadcast){
    broadcastNode = broadcast
  })

  obs.resolvePath = function(src){
    return context.project.resolve([context.cwd||'', src])
  }

  obs.relative = function(path){
    var currentDir = context.project.resolve([context.cwd])
    return relative(currentDir, path)
  }

  obs.load = function(src){
    if (src){
      loading = true
      obs.file = context.project.getFile(src)
      obs.path = obs.file.path
      context.cwd = getDirName(obs.file.path)
      switchTo(JsonFile(obs.file))
    } else {
      obs.file = null
      switchTo(null)
    }
  }

  obs.rename = function(newFileName){
    if (obs.file){
      var oldFile = obs.file
      var currentFileName = getBaseName(obs.file.path)
      if (newFileName !== currentFileName){
        var directory = getDirName(obs.file.path)
        var newPath = join(directory, newFileName)
        
        var src = context.project.relative(newPath)
        obs.file = context.project.getFile(src)
        obs.file.set(obs.file())
        obs.path = obs.file.path

        switchTo(JsonFile(obs.file))
        oldFile.delete()
      }
    }
  }

  obs.onClose = Event(function(broadcast){
    obs.close = broadcast
  })

  obs.onClose(function(){
    releaseInstance&&releaseInstance()
    obs.node && obs.node.destroy && obs.node.destroy()
    obs.node = null
    switchTo(null)
  })

  return obs

  // scoped

  function switchTo(target){
    if (releaseFile){
      releaseFile()
      releaseFile = null
    }

    if (parsedFile){
      parsedFile.destroy()
      parsedFile = null
    }

    if (target){
      parsedFile = target
      releaseFile = watch(target, obs.set)
    } else {
      obs.set(null)
    }
  }

  function getNode(value){
    return value && value[context.nodeKey||'node'] || null
  }

}

function JsonFile(file){
  var obs = Observ()
  var lastSaved = null
  var currentTransaction = NO_TRANSACTION

  var removeWatcher = watch(file, function(data){
    if (lastSaved !== data){
      lastSaved = data
      data = JSON.parse(data||'{}')
      currentTransaction = data
      obs.set(data)
      currentTransaction = NO_TRANSACTION
    }
  })

  var removeListener = obs(function(data){
    if (data !== currentTransaction){
      lastSaved = JSON.stringify(data)
      file.set(lastSaved)
    }
  })

  obs.destroy = function(){
    removeListener()
    removeWatcher()
    file.close()
    obs.set(null)
  }

  return obs
}