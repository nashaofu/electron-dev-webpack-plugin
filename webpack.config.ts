import path from 'path'
import webpack, { Configuration } from 'webpack'
import ElectronDevWebpackPlugin from './src'

const config: Configuration = {
  mode: 'development',
  target: 'electron-main',
  entry: {
    app: './app.js'
  },
  output: {
    path: path.resolve(__dirname, '../dist'),
    filename: '[name].js'
  },
  watch: true,
  devtool: false,
  plugins: [new ElectronDevWebpackPlugin()]
}

webpack(config, (err, stats) => {
  if (err) return console.log(err)
  // 打印结果
  process.stdout.write(
    stats.toString({
      colors: true,
      modules: false,
      children: false,
      chunks: false,
      chunkModules: false
    }) + '\n\n'
  )
})
