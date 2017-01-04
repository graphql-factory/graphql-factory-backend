import babel from 'rollup-plugin-babel';

export default {
  entry: 'src/util.js',
  format: 'cjs',
  plugins: [ babel() ],
  dest: 'util.js'
}