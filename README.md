# electron-dev-webpack-plugin
A webpack plugin for electron development, When the file changes automatically restart electron main process. example: [shortcut-capture](https://github.com/nashaofu/shortcut-capture/blob/master/build/main/webpack.dev.conf.js#L15)

## Usage
```js
new ElectronDevWebpackPlugin()
// or
new ElectronDevWebpackPlugin({
  port: 5858 // electron inspect port
})
```