import chalk from 'chalk'
import kill from 'tree-kill'
import electron from 'electron'
import spawn from 'cross-spawn'
import { Compiler } from 'webpack'
import portfinder from 'portfinder'
import { ChildProcess } from 'child_process'

interface Options {
  port?: number
  title?: string
  info?: (data: string) => void
  warn?: (data: string) => void
}

interface Logger {
  info?: (data: string) => void
  warn?: (data: string) => void
}

export = class ElectronDevWebpackPlugin {
  private port: number
  private title: string
  private process?: ChildProcess | null
  private logger: Logger

  constructor ({
    port = 5858, // electron inspect端口
    title = 'MAIN PROCESS',
    info,
    warn
  }: Options = {}) {
    this.port = port
    this.title = title
    this.logger = {
      info,
      warn
    }
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
    compiler.hooks.done.tapPromise('ElectronDevWebpackPlugin', async () => {
      let port
      try {
        await this.kill()
        if (typeof this.port === 'number') {
          port = await portfinder.getPortPromise({ port: this.port })
        }
      } catch (e) {
        console.error(e)
      }
      const args = typeof port === 'number' ? [`--inspect=${port}`, '.'] : ['.']
      this.process = spawn(electron as unknown as string, args, {
        stdio: ['inherit', 'pipe', 'pipe']
      })
      if (this.process.stdout) {
        this.process.stdout.on('data', (data: Buffer) => {
          if (typeof this.logger.info === 'function') {
            this.logger.info(data.toString())
          } else {
            this.info(data.toString())
          }
        })
      }
      if (this.process.stderr) {
        this.process.stderr.on('data', (data: Buffer) => {
          if (typeof this.logger.warn === 'function') {
            this.logger.warn(data.toString())
          } else {
            this.warn(data.toString())
          }
        })
      }
    })
  }

  /**
   * 清理旧进程
   */
  private kill (): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.process || this.process.killed) return resolve()
      kill(this.process.pid, 'SIGKILL', err => {
        if (err) return reject(err)
        this.process = null
        resolve()
      })
    })
  }

  /**
   * 打印主进程输出日志
   * @param {string} data
   */
  private info (data: string) {
    const title = chalk.bgBlue.black('', this.title, '')
    const pid = chalk.bgWhite.black('', this.process ? `PID:${this.process.pid}` : '--', '')
    console.log(`${title}${pid} ${chalk.blue('Info...')}\n`)
    console.log(chalk.blueBright.strikethrough(data))
  }

  /**
   * 打印主进程输出错误
   * @param {string} data
   */
  private warn (data: string) {
    const title = chalk.bgYellow.black('', this.title, '')
    const pid = chalk.bgWhite.black('', this.process ? `PID:${this.process.pid}` : '--', '')
    console.log(`${title}${pid} ${chalk.yellow('Warning...')}\n`)
    console.log(chalk.yellowBright.strikethrough(data))
  }
}
