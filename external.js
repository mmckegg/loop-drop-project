var Observ = require('observ')
var extend = require('xtend')
var computed = require('observ/computed')
var watch = require('observ/watch')
var Event = require('geval')
var nextTick = require('next-tick')
var resolveNode = require('observ-node-array/resolve')

module.exports = External

function External(context){  
  var node = Observ({})
  node.context = context

  var additionalParams = getAdditional(node)
  var externalParams = null

  var release = null
  var releaseCC = null

  var lastDescriptor = null
  node.inner = null
  node.file = null
  node.controllerContext = Observ()
  node.resolved = Observ()

  node.destroy = function(){
    if (node.inner && node.inner.destroy){
      node.inner.destroy()
      node.inner = null
    }

    if (release){
      release()
      release = null
      externalParams = null
    }

  }

  watch(node, function(descriptor){
    if (externalParams && externalParams.src != descriptor.src){
      release()
      release = null
      externalParams = null
      node.file = null
    }

    if (!externalParams){
      if (descriptor.src){
        context.project.checkExists([context.cwd||'', descriptor.src], function(err, exists){
          if (exists){
            release&&release()
            node.file = context.project.getFile([context.cwd||'', descriptor.src])
            externalParams = computedJsonObject(node.file)
            externalParams.src = descriptor.src
            release = watch(externalParams, update)
          }
        })
      }
    } else {
      update()
    }
  })

  function update(){
    var descriptor = extend(externalParams(), additionalParams())
    var ctor = descriptor && resolveNode(context.nodes, descriptor.node)


    if (node.inner && descriptor && node && lastDescriptor && descriptor.node == lastDescriptor.node){
      node.inner.set(descriptor)
      node.resolved.set(descriptor)
    } else {

      if (node.inner && node.inner.destroy){
        node.inner.destroy()

        if (releaseCC){
          releaseCC()
          releaseCC = null
          node.controllerContext.set(null)
          node.resolved.set(null)
        }
      }

      node.inner = null

      if (descriptor && ctor){
        node.inner = ctor(context)
        node.inner.nodeName = descriptor.node
        node.inner.set(descriptor)

        if (node.inner.controllerContext){
          releaseCC = watch(node.inner.controllerContext, node.controllerContext.set)
        }

        node.resolved.set(descriptor)
      }
    }

    lastDescriptor = descriptor 
  }

  return node
}

function computedJsonObject(obs){
  return computed([obs], function(a){
    return JSON.parse(a&&a.trim()||'{}')
  })
}

function getAdditional(obs){
  return computed([obs], function(a){
    return Object.keys(a).reduce(function(res, key){
      if (key !== 'node' && key !== 'src'){
        res[key] = a[key]
      }
      return res
    }, {})
  })
}

function resolveNode(nodes, nodeName){
  if (!nodeName){
    return null
  }
  var node = nodes || {}
  while (nodeName && node){
    var index = nodeName.indexOf('/')
    if (index < 0){
      node = node[nodeName]
      nodeName = null
    } else {
      var key = nodeName.slice(0, index)
      nodeName = nodeName.slice(index+1)
      node = node[key]
    }
  }
  return node
}