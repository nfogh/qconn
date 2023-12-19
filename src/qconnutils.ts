import { PacketizedSocket } from './packetizedSocket'
import { Socket } from 'net'
import { PromiseSocket } from '@nfogh/promise-socket'

export type QConnServices = 'launcher' | 'file' | 'sinfo' | 'cntl';

export async function activateService(client: PacketizedSocket, service: QConnServices): Promise<void> {
  try {
    await client.write(`service ${service}\r\n`)
    await client.read('OK\r\n')
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Timeout') {
      throw new Error(`Could not activate service ${service}: Timeout`)
    } else {
      throw e;
    }
  }
}

export async function newQConnClient(host: string, port: number = 8000): Promise<PacketizedSocket> {
  try {
    const socket = new PromiseSocket(new Socket())
    await socket.connect(port, host)
    const client = new PacketizedSocket(socket)
    await client.read('QCONN\r\n')
    await client.read(Buffer.from([0xff, 0xfd, 0x22]))
    return client
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Timeout') {
      throw new Error(`Could not connect to qconn broker on ${host}:${port}: Timeout`)
    } else {
      throw e;
    }
  }
}
