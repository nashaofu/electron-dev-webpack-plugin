import chalk from 'chalk'
import kill from 'tree-kill'
import electron from 'electron'
import spawn from 'cross-spawn'
import { Compiler } from 'webpack'
import portfinder from 'portfinder'
import { ChildProcess } from 'child_process'

declare interface Options {
  port?: number
}

export = class ElectronDevWebpackPlugin {
  private port: number
  private process?: ChildProcess | null

  constructor ({
    port = 5858 // electron inspect端口
  }: Options = {}) {
    this.port = port
    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM']

    /**
     * 主进程结束后同时也结束子进程
     */
    signals.forEach(signal => {
      /**
       * SIGTERM 和 SIGINT 在非windows平台绑定了默认的监听器，这样进程以代码128 + signal number结束之前，可以重置终端模式。
       * 如果这两个事件任意一个绑定了新的监听器，原有默认的行为会被移除(Node.js不会结束，需要手动结束)。
       */
      process.on(signal, () => {
        this.kill()
          .then(() => process.exit(0))
      })
    })
  }

  /**
   * webpack调用接口
   * @param {*} compiler
   */
  public apply (compiler: Compiler) {
    portfinder.basePort = this.port
    compiler.hooks.done.tapPromise('ElectronDevWebpackPlugin', () => {
      const promise = portfinder.getPortPromise()
      promise.then(port => this.spawn(port)).catch(() => this.spawn())
      return promise
    })
  }

  /**
   * 启动新进程
   * @param {Number|undefined} port
   */
  private spawn (port?: number) {
    this.kill().then(() => {
      const args = typeof port === 'number' ? [`--inspect=${port}`, '.'] : ['.']
      this.process = spawn(electron as unknown as string, args, {
        stdio: ['inherit', 'pipe', 'pipe']
      })
      if (this.process.stdout) {
        this.process.stdout.on('data', (data: Buffer) => this.info(data))
      }
      if (this.process.stderr) {
        this.process.stderr.on('data', (data: Buffer) => this.warn(data))
      }
    })
  }

  /**
   * 清理旧进程
   */
  private kill (): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.process) {
        return resolve()
      }
      kill(this.process.pid, 'SIGKILL', () => {
        this.process = null
        resolve()
      })
    })
  }

  /**
   * 打印主进程输出日志
   * @param {Buffer} data
   */
  private info (data: Buffer) {
    console.log(`${chalk.bgGreen.black('', 'MAIN PROCESS', '')} ${chalk.green('Info Start')}\n`)
    console.log(chalk.yellowBright.strikethrough(data.toString()))
    console.log(`${chalk.bgGreen.black('', 'MAIN PROCESS', '')} ${chalk.green('Info End')}\n`)
  }

  /**
   * 打印主进程输出错误
   * @param {Buffer} data
   */
  private warn (data: Buffer) {
    console.log(`${chalk.bgRed.black('', 'MAIN PROCESS', '')} ${chalk.red('Warn Start')}\n`)
    console.log(chalk.redBright.strikethrough(data.toString()))
    console.log(`${chalk.bgRed.black('', 'MAIN PROCESS', '')} ${chalk.red('Warn End')}\n`)
  }
}
