var Project = require('../')

function doTest(t, fs, root){
  fs.mkdir(root, function(err){
    if (err) throw err

    var project = Project({fs: fs})
    project.load(root, function(err){
      if (err) throw err
      t.equal(project.entries().length, 0, 'empty')

      project.createDirectory('/setups', function(err){
        if (err) throw err

        project.createFile('/setups/test-1', function(err, file){
          if (err) throw err
          file.set('hello')
        })

      })
    })
  })

  setTimeout(function(){
    var existingProject = Project({fs: fs})
    existingProject.load(root, function(err){
      if (err) throw err

      console.log(existingProject.entries())
      t.deepEqual(existingProject.entries(), [
        { "type":"directory",
          "fileName":"setups",
          "path":"setups",
          "entries":[
            {"type":"file","fileName":"test-1","path":"setups/test-1"}
          ]
        }
      ])

      var changes = []
      existingProject.entries(function(data){
        changes.push(data)
      })

      existingProject.getFile('/setups/test-1', function(err, file1){
        if (err) throw err
        t.equal(file1(), 'hello')

        existingProject.createFile('/setups/test-2', function(err, file2){
          if (err) throw err
          file2.set('hello again')

          setTimeout(function(){
            existingProject.list('/setups', function(err, res){
              t.deepEqual(res, ['setups/test-1', 'setups/test-2'])
            })
          }, 20)

          setTimeout(function(){
            file1.delete()
          }, 100)

          setTimeout(createAnotherFileAndCheckForChanges, 200)
        })

      })

      function createAnotherFileAndCheckForChanges(){
        t.equal(changes.length, 2)
        t.deepEqual(changes[0][0].entries, [
          { fileName: "test-1", path: "setups/test-1", type: "file" },
          { fileName: 'test-2', path: 'setups/test-2', type: 'file' }
        ])
        t.deepEqual(changes[1][0].entries, [
          { fileName: 'test-2', path: 'setups/test-2', type: 'file' }
        ])
        t.end()
      }

    })
  }, 100)

}

module.exports = doTest