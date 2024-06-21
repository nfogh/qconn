import { BufferReader } from 'node-bufferreader';
import type { PacketizedSocket } from './packetizedSocket';
import { newQConnClient, activateService } from './qconnutils';

export interface SysInfo {
  hostname: string
  memTotal: bigint
  memFree: bigint
};

export interface ProcessMMap {
  flags: number,
  vAddr: bigint,
  size: bigint,
  offset: bigint,
  device: number,
  inode: number,
  path: string
};

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

function toString(buffer: Buffer): string {
  const nullTerminatorIndex = buffer.indexOf(0);
  if (nullTerminatorIndex === -1) {
    return buffer.toString('utf8');
  }
  return buffer.subarray(0, nullTerminatorIndex).toString('utf8');
}

export class SInfoService {
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

  async getSysInfo(): Promise<SysInfo> {
    await this.socket.write("get sysinfo\r\n");
    await this.socket.read(8);
    const datalen = (await this.socket.read(4)).readInt32LE() - 8;
    const packet = new BufferReader(await this.socket.read(datalen));
    packet.readBuffer(4 * 4);
    const hostnameLength = packet.readInt16LE();
    const hostname = toString(packet.readBuffer(hostnameLength));
    packet.readBuffer(4); // TODO: What is this
    packet.readBuffer(2); // TODO: What is this
    const memTotal = packet.readBigUInt64LE();
    const memFree = packet.readBigInt64LE();

    return { hostname, memTotal, memFree };
  }

  async getMMaps(pid: number): Promise<ProcessMMap[]> {
    await this.socket.write(`get mmaps ${pid}\r\n`);
    const mmapHeader = await this.socket.read(28);
    // 4th int is the payload length
    const dataSize = mmapHeader.readInt32LE(4 * 3);
    const data = await this.socket.read(dataSize);

    // Each mmap uses 164 bytes
    const map: ProcessMMap[] = [];
    const chunkSize = 164;
    for (let i = 0; i < data.length / chunkSize; i++) {
      const chunk = new BufferReader(data.subarray(i * chunkSize, ((i + 1) * chunkSize)));

      map.push({
        flags: chunk.readUInt32LE(),
        vAddr: chunk.readBigUInt64LE(),
        size: chunk.readBigUInt64LE(),
        offset: chunk.readBigUInt64LE(),
        device: chunk.readUInt32LE(),
        inode: chunk.readUInt32LE(),
        path: toString(chunk.readBuffer(128))
      });
    }

    return map;
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
        path: toString(chunk.readBuffer(128))
      };
      map.set(pid, processInfo);
    }

    return map;
  }
}
