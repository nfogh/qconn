import type { PacketizedSocket } from './packetizedSocket'
import { newQConnClient, activateService } from './qconnutils'

export class LauncherService implements AsyncDisposable {
  private readonly host: string
  private readonly port: number
  private _socket: PacketizedSocket | undefined = undefined

  private constructor(host: string, port: number = 8000) {
    this.host = host
    this.port = port
  }

  get socket(): PacketizedSocket {
    if (this._socket === undefined) {
      throw new Error('Connection is undefined')
    }
    return this._socket;
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.disconnect()
  }

  async disconnect(): Promise<void> {
    if (this._socket !== undefined) {
      // TODO: Figure out if we need to issue a 'quit' command here
      // If we have executed a command, the remote end has probably already quit
      await this._socket.end()
      this._socket = undefined
    }
  }

  static async connect(host: string, port: number = 8000): Promise<LauncherService> {
    const service = new LauncherService(host, port)
    service._socket = await newQConnClient(host, port)
    await activateService(service._socket, 'launcher')
    return service
  }

  async execute(command: string, args?: string[]): Promise<string> {
    await this.socket.write(`start/flags run ${command} ${command} ${args?.join(' ')}\r\n`)
    await this.socket.read('\r\n')
    const stdout = await this.socket.readUntilClose()
    return stdout.toString('utf8')
  }
}
