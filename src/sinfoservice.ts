import { BufferReader } from 'node-bufferreader';
import type { PacketizedSocket } from './packetizedSocket';
import { newQConnClient, activateService } from './qconnutils';

export interface ProcessInfo {
  pid: number
  path: string
  parent: number
  flags: number
  uMask: number
  child: number
  sibling: number
  pGrp: number
  sId: number
  baseAddress: bigint
  initialStack: bigint
  uId: number
  gId: number
  eUID: number
  egid: number
  suid: number
  sgid: number
  sigIgnore: bigint
  sigQueue: bigint
  sigPending: bigint
  numChancons: number
  numFdcons: number
  numThreads: number
  numTimers: number
  startTime: bigint
  uTime: bigint
  sTime: bigint
  cutime: bigint
  cstime: bigint
  codesize: number
  datasize: number
  stacksize: number
  vStacksize: number
}

function toNullTerminatedString(buffer: Buffer): string {
  const nullTerminatorIndex = buffer.indexOf(0);
  if (nullTerminatorIndex === -1) {
    throw new Error('Could not find null terminator in buffer');
  }
  return buffer.subarray(0, nullTerminatorIndex).toString('utf8');
}

export class SInfoService implements AsyncDisposable {
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
      await this.socket.write('done\r\n');
      await this._socket.end();
      this._socket = undefined;
    }
  }

  static async connect(host: string, port: number = 8000): Promise<SInfoService> {
    const service = new SInfoService(host, port);
    service._socket = await newQConnClient(host, port);
    await activateService(service._socket, 'sinfo');
    return service;
  }

  async getPids(): Promise<Map<number, ProcessInfo>> {
    await this.socket.write('get pids\r\n');
    const pidHeader = await this.socket.read(28);
    // 4th int is the payload length
    const dataSize = pidHeader.readInt32LE(4 * 3);
    const data = await this.socket.read(dataSize);

    // Each process uses 296 bytes
    const map = new Map<number, ProcessInfo>();
    const chunkSize = 296;
    for (let i = 0; i < data.length / chunkSize; i++) {
      const chunk = new BufferReader(data.subarray(i * chunkSize, ((i + 1) * chunkSize)));
      const pid = chunk.readInt32LE();

      const processInfo: ProcessInfo = {
        pid,
        parent: chunk.readInt32LE(),
        flags: chunk.readInt32LE(),
        uMask: chunk.readInt32LE(),
        child: chunk.readInt32LE(),
        sibling: chunk.readInt32LE(),
        pGrp: chunk.readInt32LE(),
        sId: chunk.readInt32LE(),
        baseAddress: chunk.readBigInt64LE(),
        initialStack: chunk.readBigInt64LE(),
        uId: chunk.readInt32LE(),
        gId: chunk.readInt32LE(),
        eUID: chunk.readInt32LE(),
        egid: chunk.readInt32LE(),
        suid: chunk.readInt32LE(),
        sgid: chunk.readInt32LE(),
        sigIgnore: chunk.readBigInt64LE(),
        sigQueue: chunk.readBigInt64LE(),
        sigPending: chunk.readBigInt64LE(),
        numChancons: chunk.readInt32LE(),
        numFdcons: chunk.readInt32LE(),
        numThreads: chunk.readInt32LE(),
        numTimers: chunk.readInt32LE(),
        startTime: chunk.readBigInt64LE(),
        uTime: chunk.readBigInt64LE(),
        sTime: chunk.readBigInt64LE(),
        cutime: chunk.readBigInt64LE(),
        cstime: chunk.readBigInt64LE(),
        codesize: chunk.readInt32LE(),
        datasize: chunk.readInt32LE(),
        stacksize: chunk.readInt32LE(),
        vStacksize: chunk.readInt32LE(),
        path: toNullTerminatedString(chunk.readBuffer(128))
      };
      map.set(pid, processInfo);
    }

    return map;
  }
}
