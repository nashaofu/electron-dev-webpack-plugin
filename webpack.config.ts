import path from 'path'
import webpack, { Configuration } from 'webpack'
import ElectronDevWebpackPlugin from './src'

const config: Configuration = {
  mode: 'development',
  entry: {
    app: './app.js'
  },
  output: {
    path: path.resolve(__dirname, '../dist'),
    filename: '[name].js'
  },
  watch: true,
  devtool: false,
  plugins: [
    new ElectronDevWebpackPlugin()
  ]
}

webpack(config, (err, stats) => {
  console.log(err)
})
