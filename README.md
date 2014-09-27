loop-drop-project
===

Provides scoped object access and persistence layer for [Loop Drop](https://github.com/mmckegg/loop-drop-app) objects.

See [index.js](https://github.com/mmckegg/loop-drop-project/blob/master/index.js) for method list.

Tested under the following `fs` implementations:
  - [Node's built in `fs`](http://nodejs.org/api/fs.html)
  - [`level-filesystem`](https://github.com/mafintosh/level-filesystem) (backed by [level-js](https://github.com/maxogden/level.js) in browser)
  - [`web-fs`](https://github.com/mmckegg/web-fs) (Web File System API and Chrome Packaged Apps).