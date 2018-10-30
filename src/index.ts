import chalk from 'chalk'
import { ChildProcess, spawn } from 'child_process'
import electron from 'electron'
import portfinder from 'portfinder'

declare module 'child_process' {
  function spawn (command: string | electron.AllElectron, args?: string[], options?: SpawnOptions): ChildProcess
}

export = class ElectronDevWebpackPlugin {
  private port: number
  private process: ChildProcess[] = []
  private timer?: NodeJS.Timer

  constructor ({
    port = 5858 // electron inspect端口
  } = {}) {
    this.port = port
  }

  /**
   * webpack调用接口
   * @param {*} compiler
   */
  public apply (compiler: any) {
    portfinder.basePort = this.port
    compiler.plugin('done', () => {
      portfinder.getPortPromise()
        .then(port => this.spawn(port))
        .catch(err => this.spawn())
    })
  }

  /**
   * 启动新进程
   * @param {Number|undefined} port
   */
  private spawn (port?: number) {
    this.clear()
      .then(() => {
        const args = typeof port === 'number'
          ? [`--inspect=${port}`, '.']
          : ['.']
        const cp: ChildProcess = spawn(electron, args)

        cp.stdout.on('data', data => {
          this.log(chalk.yellowBright.bold.strikethrough(data.toString()))
        })
        cp.stderr.on('data', data => {
          this.log(chalk.redBright.bold.strikethrough(data.toString()))
        })
        cp.on('close', () => {
          this.process = this.process.filter(p => p.pid !== cp.pid)
        })
        this.process.push(cp)
      })
  }

  /**
   * 清理旧进程
   */
  private clear (): Promise<void> {
    return new Promise((resolve, reject) => {
      const next = () => {
        this.kill()
        // 检查旧进程，防止没有被清理掉
        if (this.timer) {
          clearTimeout(this.timer)
        }
        if (this.process.length) {
          this.timer = setTimeout(() => next(), 1000)
        } else {
          resolve()
        }
      }
      next()
    })
  }

  /**
   * 杀掉进程
   */
  private kill () {
    this.process = this.process.reduce((p: ChildProcess[], cp: ChildProcess) => {
      if (!cp.killed) {
        try {
          if (process.platform === 'linux' || process.platform === 'darwin') {
            process.kill(cp.pid)
          }
          cp.kill()
        } catch (e) {
          console.log(`kill ${chalk.red(cp.pid.toString())} process is failed, ${chalk.red(e)}`)
        }
      }
      if (!cp.killed) {
        p.push(cp)
      }
      return p
    }, [])
  }

  /**
   * 打印主进程输出
   * @param {*} data
   */
  private log (data: string) {
    console.log('------------Main Process Log Start------------')
    console.log(data)
    console.log('-------------Main Process Log End-------------')
  }
}
