import { newQConnClient } from './qconnutils'

export async function getInfo(host: string, port: number = 8000): Promise<Map<string, string>> {
  const socket = await newQConnClient(host, port)
  await socket.write('info\r\n')
  const response = await socket.read('\r\n')
  const tokens = response.toString('utf8').replace('\r\n', '').split(' ')
  const infoMap = new Map<string, string>()
  for (const token of tokens) {
    const [key, value] = token.split('=')
    infoMap.set(key, value)
  }
  return infoMap
}
