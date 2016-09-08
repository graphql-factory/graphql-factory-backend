import _ from 'lodash'
import { rollup } from 'rollup'
import babel from 'rollup-plugin-babel'
import Promise from 'bluebird'
import path from 'path'
import FileSystem from 'fs'
let fs = Promise.promisifyAll(FileSystem)

let baseDir = path.resolve(__dirname.replace(/(^.*\/graphql-factory-backend)\/build.*$/, '$1'))
let babelrc = path.resolve(`${baseDir}/build/.build.babelrc`)

function copy (src, dest, encoding = 'utf8', modifier) {
  return fs.readFileAsync(src, { encoding }).then((data) => {
    data = _.isFunction(modifier) ? modifier(data) : data
    return fs.writeFileAsync(dest, data, { encoding })
  })
}

function del (file) {
  return fs.unlinkAsync(file)
}

function babelPath (build) {
  return path.resolve(baseDir, build.entry.replace(/index.js$/, '/.babelrc'))
}

let builds = [
  { entry: 'src/base/index.js', dest: 'base.js' },
  { entry: 'src/rethinkdb/index.js', dest: 'rethinkdb.js' },
  { entry: 'src/knex/index.js', dest: 'knex.js' },
  { entry: 'src/mongodb/index.js', dest: 'mongodb.js' },
  { entry: 'src/index.js', dest: 'index.js' },
]

// copy all babelrc files first
Promise.each(builds, (build) => copy(babelrc, babelPath(build)))

  // build the source
  .then(() => {

    // rollup each source
    return Promise.each(builds, (build) => {
      return rollup({
        entry: path.resolve(`${baseDir}/${build.entry}`),
        plugins: [ babel() ]
      })

        // write each bundle
        .then((bundle) => {
          return bundle.write({
            format: 'cjs',
            dest: path.resolve(`${baseDir}/${build.dest}`)
          })
        })
    })
  })
  // clean up the babelrc files
  .then(() => Promise.each(builds, (build) => del(babelPath(build))))