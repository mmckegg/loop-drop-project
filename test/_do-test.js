var Project = require('../')

function doTest(t, fs, root){

  fs.mkdir(root, function(err){
    if (err) throw err

    var project = Project(fs)

    var rootObs = project.getDirectory('.')
    var setupsObs = project.getDirectory('setups')

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
      project.createDirectory('setups', function(err){
        if (err) throw err
      })
    })

    setTimeout(function(){

     project.resolveAvailable('setups/file.txt', function(err, availableName){
       t.equal(availableName, 'setups/file.txt')
       project.getFile(availableName, function(){
         project.resolveAvailable(availableName, function(err, availableName){
           t.equal(availableName, 'setups/file 1.txt')
           project.getFile(availableName, function(){
             project.resolveAvailable(availableName, function(err, availableName){
               t.equal(availableName, 'setups/file 2.txt')
             })
           })
         })
       })
     })

     var fileObs = project.getFile('setups/test-1')
     var fileObs2 = project.getFile('setups/test-1')

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



      var closed = false
      project.createDirectory('rename-me', function(err){
        if (err) throw err
        var renameParentToClose = project.getFile('rename-me/file', function(err, file){
          file.onClose(function(){
            closed = true
          })
          setTimeout(function(){
            project.moveEntry('rename-me', 'renamed-me')
          }, 200)
        })
      })

      setTimeout(function(){
        // fails under level-filesystem 
        // see https://github.com/mafintosh/level-filesystem/issues/5
        t.ok(closed, 'file closed by rename')
      }, 500)

      setTimeout(function(){
        project.deleteEntry('setups', function(err){
          t.notOk(err)

          project.close()

          t.deepEqual(project._state.openDirectories, [])
          t.deepEqual(project._state.openFiles, [])
        })
      }, 500)
    }, 1700)

    setTimeout(function(){
      t.end()
    }, 2400)

  })

}

module.exports = doTest