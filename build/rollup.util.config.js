import babel from 'rollup-plugin-babel';

export default {
  entry: 'src/util.js',
  format: 'cjs',
  plugins: [ babel() ],
  external: ['lodash', 'rethinkdb-doc-filter', 'bluebird', 'js-md5', 'events'],
  dest: 'util.js'
}