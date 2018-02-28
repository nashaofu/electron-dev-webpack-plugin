const chalk = require('chalk')
const electron = require('electron')
const portfinder = require('portfinder')
const { spawn } = require('child_process')

module.exports = class ElectronDevWebpackPlugin {
  constructor ({
    port = 5858
  } = {}) {
    this.port = port
    this.process = []
    this.timer = null
  }

  /**
   * webpack调用接口
   * @param {*} compiler 
   */
  apply (compiler) {
    portfinder.basePort = this.port
    compiler.plugin('done', stats => {
      portfinder.getPortPromise()
        .then(port => this.spawn(port))
        .catch(err => this.spawn())
    })
  }

  /**
   * 启动新进程
   * @param {Number|undefined} port 
   */
  spawn (port) {
    this.clear()
      .then(() => {
        const args = typeof port === 'number'
          ? [`--inspect=${port}`, '.']
          : ['.']
        const cp = spawn(electron, args)

        cp.stdout.on('data', data => {
          this.log(chalk.yellowBright.bold.strikethrough(data))
        })
        cp.stderr.on('data', data => {
          this.log(chalk.redBright.bold.strikethrough(data))
        })
        this.process.push(cp)
      })
  }

  /**
   * 清理旧进程
   */
  clear () {
    return new Promise((resolve, reject) => {
      this.kill()
      // 检查旧进程，防止没有被清理掉
      clearTimeout(this.timer)
      if (this.process.length) {
        this.timer = setTimeout(() => this.kill(), 1000)
      } else {
        resolve()
      }
    })
  }

  /**
   * 杀掉进程
   */
  kill () {
    this.process = this.process.reduce((p, cp) => {
      if (!cp.killed) {
        try {
          cp.kill()
        } catch (e) {
          console.log(`kill ${chalk.red(cp.pid)} process is failed, ${chalk.red(e)}`)
        }
        if (!cp.killed) {
          p.push(cp)
        }
      }
      return p
    }, [])
  }

  /**
   * 打印主进程输出
   * @param {*} data
   */
  log (data) {
    console.log('---------------------Main Process Log Start---------------------')
    console.log(data)
    console.log('----------------------Main Process Log End----------------------')
  }
}
