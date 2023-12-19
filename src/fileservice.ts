import type { PacketizedSocket } from './packetizedSocket'
import { newQConnClient, activateService } from './qconnutils'

function removeLineBreaksFromEnd(inputString: string): string {
  const regex = /\r?\n$/
  const resultString = inputString.replace(regex, '')
  return resultString
}

export enum OpenFlags {
  O_RDONLY = 0,
  O_WRONLY = (1 << 0),
  O_RDWR = (1 << 1),

  O_APPEND = (1 << 3),

  O_CREAT = (1 << 8),
  O_TRUNC = (1 << 9)
}

export enum Permissions {
  S_IXOTH = 1 << 0,
  S_IWOTH = 1 << 1,
  S_IROTH = 1 << 2,
  S_IXGRP = 1 << 3,
  S_IWGRP = 1 << 4,
  S_IRGRP = 1 << 5,
  S_IXUSR = 1 << 6,
  S_IWUSR = 1 << 7,
  S_IRUSR = 1 << 8,
  S_IFDIR = 0x4000,
  S_IFREG = 0x8000
}

export interface FileStat {
  ino: number
  size: number
  dev: number
  rdev: number
  uid: number
  gid: number
  mtime: number
  atime: number
  ctime: number
  mode: number
  nlink: number
  blocksize: number
  nblocks: number
  blksize: number
  blocks: number
}

export class FileService implements AsyncDisposable {
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
      await this.socket.write('q')
      await this._socket.end()
      this._socket = undefined
    }
  }

  static async connect(host: string, port: number = 8000): Promise<FileService> {
    const service = new FileService(host, port)
    service._socket = await newQConnClient(host, port)
    await activateService(service._socket, 'file')
    return service
  }

  async delete(path: string): Promise<void> {
    await this.socket.write(`d:"${path}":1\r\n`)
    const response = (await this.socket.read('\r\n')).toString('utf8')
    const responseFields = response.split(':')
    if (responseFields.length === 2 && responseFields[0] === 'e') {
      throw new Error(`Unable to delete ${path}: ${removeLineBreaksFromEnd(responseFields[1])}`)
    } else if (responseFields.length !== 1) {
      throw new Error(`Invalid response. Number of fields should have been 1. Reply was ${response}`)
    } else if (responseFields[0] !== 'o\r\n') {
      throw new Error(`Response was not 'o'. It was ${response}`)
    }
  }

  async move(sourcePath: string, destPath: string): Promise<void> {
    await this.socket.write(`m:"${sourcePath}":"${destPath}"\r\n`)
    const response = (await this.socket.read('\r\n')).toString('utf8')
    const responseFields = response.split(':')
    if (responseFields.length === 2 && responseFields[0] === 'e') {
      throw new Error(`Unable to move ${sourcePath} to ${destPath}: ${removeLineBreaksFromEnd(responseFields[1])}`)
    } else if (responseFields.length !== 1) {
      throw new Error(`Invalid response. Number of fields should have been 1. Reply was ${response}`)
    } else if (responseFields[0] !== 'o\r\n') {
      throw new Error(`Response was not 'o'. It was ${response}`)
    }
  }

  async list(path: string): Promise<string[]> {
    const directoryFileId = await this.open(path, 0, Permissions.S_IFDIR);
    try {
      let entries: string[] = []
      let readIndex = 0 // Increments by 1 for each read
      let length = 0
      do {
        await this.socket.write(`r:${directoryFileId}:${readIndex}:400:1\r\n`)
        readIndex++
        const readResponse = (await this.socket.read('\r\n')).toString('utf8')

        const readFields = readResponse.split(':')
        if (readFields.length !== 4) {
          throw new Error(`Invalid response. Number of fields should have been 4. Reply was ${readResponse}`)
        }
        if (readFields[0] !== 'o') {
          throw new Error(`Response was not 'o'. It was ${readResponse}`)
        }
        length = parseInt(readFields[2], 16)

        const rawList = (await this.socket.read(length)).toString('utf8')
        entries = entries.concat(rawList.split('\r\n').slice(0, -1))
      } while (length !== 0)

      return entries.filter((entry) => entry !== '.' && entry !== '..')
    } finally {
      await this.close(directoryFileId)
    }
  }

  // Opens a file and returns the file descriptor
  async open(path: string, openFlags: OpenFlags, permissions?: Permissions): Promise<number> {
    if (((openFlags & OpenFlags.O_CREAT) === OpenFlags.O_CREAT) && (permissions === undefined)) {
      throw new Error('You must set permissions if you are creating a file')
    }

    let openString = `o:"${path}":${openFlags.toString(16)}`
    if (permissions !== undefined) {
      openString += `:${permissions.toString(16)}`
    }

    await this.socket.write(openString + '\r\n')
    const response = (await this.socket.read('\r\n')).toString('utf8')
    const responseFields = response.split(':')

    if (responseFields.length === 2 && responseFields[0] === 'e') {
      throw new Error(`Unable to open file: ${removeLineBreaksFromEnd(responseFields[1])}`)
    } else if (responseFields.length !== 5) {
      throw new Error(`Invalid response. Number of fields should have been 5. Reply was ${response}`)
    } else if (responseFields[0] !== 'o') {
      throw new Error(`Response was not 'o'. It was ${response}`)
    }
    return parseInt(responseFields[1])
  }

  async stat(fileDescriptor: number): Promise<FileStat> {
    await this.socket.write(`s:${fileDescriptor}\r\n`)
    const response = (await this.socket.read('\r\n')).toString()
    const responseFields = response.split(':')
    if (responseFields.length === 2 && responseFields[0] === 'e') {
      throw new Error(`Unable to open file: ${removeLineBreaksFromEnd(responseFields[1])}`)
    } else if (responseFields.length !== 16) {
      throw new Error(`Invalid response. Number of fields should have been 16. Reply was ${response}`)
    } else if (responseFields[0] !== 'o') {
      throw new Error(`Response was not 'o'. It was ${response}`)
    }

    const processInfo: FileStat = {
      ino: parseInt(responseFields[1], 16),
      size: parseInt(responseFields[2], 16),
      dev: parseInt(responseFields[3], 16),
      rdev: parseInt(responseFields[4], 16),
      uid: parseInt(responseFields[5], 16),
      gid: parseInt(responseFields[6], 16),
      mtime: parseInt(responseFields[7], 16),
      atime: parseInt(responseFields[8], 16),
      ctime: parseInt(responseFields[9], 16),
      mode: parseInt(responseFields[10], 16),
      nlink: parseInt(responseFields[11], 16),
      blocksize: parseInt(responseFields[12], 16),
      nblocks: parseInt(responseFields[13], 16),
      blksize: parseInt(responseFields[14], 16),
      blocks: parseInt(responseFields[15], 16)
    }
    return processInfo
  }

  async read(fileDescriptor: number, size: number, offset: number = 0): Promise<Buffer> {
    if (size > 2 * 1024) {
      throw new Error('size must be less or equal to 2KB')
    }

    await this.socket.write(`r:${fileDescriptor}:${offset.toString(16)}:${size.toString(16)}:0\r\n`)
    const readResponse = await this.socket.read('\r\n')
    const readFields = readResponse.toString('utf8').split(':')
    if (readFields.length !== 4) {
      throw new Error(`Invalid response. Number of fields should have been 4. Reply was ${readResponse.toString()}`)
    }
    if (readFields[0] !== 'o') {
      throw new Error(`Response was not 'o'. It was ${readResponse.toString()}`)
    }
    const numRead = parseInt(readFields[1], 16)
    const chunk = await this.socket.read(numRead)
    if (!(chunk instanceof Buffer)) {
      throw new Error('Error. Chunk is not an instance of a buffer.')
    }
    return chunk
  }

  async readAll(fileDescriptor: number): Promise<Buffer> {
    const fileSize = (await this.stat(fileDescriptor)).size

    const chunks: Buffer[] = []
    const chunkSize = 2 * 1024
    for (let i = 0; i < fileSize / chunkSize; i++) {
      const chunk = await this.read(fileDescriptor, chunkSize, i * chunkSize)
      chunks.push(chunk)
    }
    return Buffer.concat(chunks)
  }

  async write(fileDescriptor: number, data: Buffer, offset: number = 0): Promise<void> {
    await this.socket.write('w:' + fileDescriptor + ':' + offset.toString(16) + ':' + data.length.toString(16) + ':0\r\n')
    await this.socket.write(data)
    const readResponse = (await this.socket.read('\r\n')).toString('utf8')
    const readFields = readResponse.split(':')
    const numWritten = parseInt(readFields[1], 16)
    if (readFields.length !== 3) {
      throw new Error(`Invalid response. Number of fields should have been 3. Reply was ${readResponse}`)
    }
    if (readFields[0] !== 'o') {
      throw new Error(`Response was not 'o'. It was ${readResponse}`)
    }
    if (numWritten !== data.length) {
      throw new Error(`Could not write whole chunk of ${data.length} bytes. Only wrote ${numWritten} bytes`)
    }
  }

  async close(fileDescriptor: number): Promise<void> {
    await this.socket.write('c:' + fileDescriptor + '\r\n')
    const response = await this.socket.read('\r\n')
    const responseFields = response.toString('utf8').split(':')
    if (responseFields.length === 2 && responseFields[0] === 'e') {
      throw new Error(`Could not close file: ${removeLineBreaksFromEnd(responseFields[1])}`)
    } else if (responseFields[0] !== 'o\r\n') {
      throw new Error(`Could not close file. Unknown error: ${response.toString('utf8')}`)
    }
  }
}
