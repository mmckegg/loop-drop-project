var Project = require('../')

function doTest(t, fs, root){

  fs.mkdir(root, function(err){
    if (err) throw err

    var project = Project(fs)

    var rootObs = project.getDirectory('/')
    var setupsObs = project.getDirectory('/setups')

    var rootChanges = []
    var setupsChanges = []
    var fileChanges = []
    var file2Changes = []

    rootObs(function(data){
      rootChanges.push(data)
    })

    setupsObs(function(data){
      setupsChanges.push(data)
    })

    project.load(root, function(err){
      if (err) throw err
      project.createDirectory('/setups', function(err){
        if (err) throw err
      })
    })

    setTimeout(function(){
      var fileObs = project.getFile('/setups/test-1')
      var fileObs2 = project.getFile('/setups/test-1')

      fileObs2(function(data){
        file2Changes.push(data)
      })

      fileObs.set('init')

      fileObs(function(data){
        fileChanges.push(data)
      })

      setTimeout(function(){
        fileObs.set('hello!')
      }, 300)

      setTimeout(function(){
        fileObs.set('hello again?')
      }, 600)
    }, 300)

    setTimeout(function(){
      t.equal(rootChanges.length, 2)
      t.equal(setupsChanges.length, 5)

      t.deepEqual(rootChanges[0],[])

      t.deepEqual(setupsChanges[0],null)
      t.deepEqual(setupsChanges[1],[])

      t.deepEqual(fileChanges, [ 'hello!', 'hello again?' ])
      t.deepEqual(file2Changes, [ 'init', 'hello!', 'hello again?' ])

      project.close()

      t.end()
    }, 1700)

  })

}

module.exports = doTest