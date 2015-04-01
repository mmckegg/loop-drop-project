var jsonQuery = require('json-query')

module.exports = QueryParam

function QueryParam(target, query){
  if (!(this instanceof QueryParam)) return new QueryParam(target, query)
  this.target = target
  this.query = query
  this.context = target.context || context
}

QueryParam.prototype.type = 'QueryParam'

QueryParam.prototype.write = QueryParam.prototype.set =function(value){
  var newObject = obtain(read(this.target))
  
  var res = jsonQuery(this.query, {data: newObject})
  var obj = jsonQuery.lastParent(res)

  if (obj){
    if (value === undefined){
      delete obj[res.key]
    } else {
      obj[res.key] = value
    }
    this.target.set(newObject)
    return true
  } else {
    return false
  }
}

QueryParam.prototype.read = function(){
  var res = jsonQuery(this.query, {data: read(this.target)})

  // fallback to inner value
  res = res.value === undefined && this.target.node ?
    jsonQuery(this.query, {data: read(this.target.node)}) : res

  return res.value
}

function obtain(obj){
  return JSON.parse(JSON.stringify(obj))
}

function read(target){
  if (typeof target === 'function'){
    return target()
  } else if (target && target.read){
    return target.read()
  }
}