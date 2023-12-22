import type { PacketizedSocket } from './packetizedSocket';
import { newQConnClient, activateService } from './qconnutils';

export enum SignalType {
  hup = 1,
  int = 2,
  quit = 3,
  kill = 9,
  term = 15,
  usr1 = 16,
  usr2 = 17
};

export class CntlService implements AsyncDisposable {
  private readonly host: string;
  private readonly port: number;
  private _socket: PacketizedSocket | undefined = undefined;

  private constructor(host: string, port: number = 8000) {
    this.host = host;
    this.port = port;
  }

  get socket(): PacketizedSocket {
    if (this._socket === undefined) {
      throw new Error('Connection is undefined');
    }
    return this._socket;
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.disconnect();
  }

  async disconnect(): Promise<void> {
    if (this._socket !== undefined) {
      await this.socket.write('quit\r\n');
      await this.socket.end();
      this._socket = undefined;
    }
  }

  static async connect(host: string, port: number = 8000): Promise<CntlService> {
    const service = new CntlService(host, port)
    service._socket = await newQConnClient(host, port)
    await activateService(service._socket, 'cntl')
    return service
  }

  async signalProcess(pid: number, signal: SignalType = SignalType.kill): Promise<void> {
    await this.socket.write('kill ' + pid.toString() + ' ' + signal.toString() + '\r\n')
    await this.socket.read('ok\r\n')
  }
}
