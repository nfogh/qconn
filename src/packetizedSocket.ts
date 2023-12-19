import type { PromiseSocket } from '@nfogh/promise-socket'
import type { Socket } from 'net'

export class PacketizedSocket {
  private readonly socket: PromiseSocket<Socket>
  private receiveBuffer: Buffer = Buffer.alloc(0)

  constructor(socket: PromiseSocket<Socket>) {
    this.socket = socket
  }

  async write(data: Buffer | string): Promise<number> {
    return await this.socket.write(data)
  }

  async end(): Promise<void> {
    await this.socket.end()
  }

  async readUntilClose(timeout: number = 50000): Promise<Buffer> {
    const t0 = Date.now()

    while (Date.now() < t0 + timeout) {
      try {
        const data = await this.socket.readAll()
        if (data instanceof Buffer) {
          this.receiveBuffer = Buffer.concat([this.receiveBuffer, data])
        } else {
          return this.receiveBuffer
        }
      } catch (e) {
        return this.receiveBuffer
      }
    }
    throw (new Error('Timeout'))
  }

  async read(endOfPacket: string | Buffer | number, timeout: number = 50000): Promise<Buffer> {
    const t0 = Date.now()

    while (Date.now() < t0 + timeout) {
      if (endOfPacket instanceof Buffer || typeof endOfPacket === 'string') {
        const index = this.receiveBuffer.indexOf(endOfPacket)
        if (index !== -1) {
          const endOfPacketIndex = index + endOfPacket.length
          const packet = Buffer.from(this.receiveBuffer.subarray(0, endOfPacketIndex))
          this.receiveBuffer = Buffer.from(this.receiveBuffer.subarray(endOfPacketIndex))
          return packet
        }
      } else if (typeof endOfPacket === 'number') {
        if (this.receiveBuffer.length >= endOfPacket) {
          const packet = Buffer.from(this.receiveBuffer.subarray(0, endOfPacket))
          this.receiveBuffer = Buffer.from(this.receiveBuffer.subarray(endOfPacket))
          return packet
        }
      }
      const data = await this.socket.read()
      if (data instanceof Buffer) {
        this.receiveBuffer = Buffer.concat([this.receiveBuffer, data])
      }
    }

    throw new Error('Timeout')
  }
}
