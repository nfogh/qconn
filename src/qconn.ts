import { newQConnClient } from './qconnutils';
import { ProcessInfo, SInfoService } from './sinfoservice';

export { CntlService, SignalType } from './cntlservice';
export { FileService, Permissions, OpenFlags } from './fileservice';
export { LauncherService } from './launcherservice';
export { SInfoService } from './sinfoservice';

interface QConnInfo {
  endian: string
  hasVersion: string
  qconnVersion: string
  os: string
  release: string
  version: string
  machine: string
  architecture: string
  cpu: string
  timezone: string
  hostname: string
  sysname: string
  domain: string
  numSrvcs: string
}

export async function getInfo(host: string, port: number = 8000): Promise<QConnInfo> {
  const socket = await newQConnClient(host, port);
  await socket.write('info\r\n');
  const response = await socket.read('\r\n');
  const tokens = response.toString('utf8').replace('\r\n', '').split(' ');
  const map = new Map<string, string>();
  for (const token of tokens) {
    const [key, value] = token.split('=');
    map.set(key, value);
  }

  return {
    endian: map.get('ENDIAN') ?? 'unknown',
    hasVersion: map.get('HASVERSION') ?? 'unknown',
    qconnVersion: map.get('QCONN_VERSION') ?? 'unknown',
    os: map.get('OS') ?? 'unknown',
    release: map.get('RELEASE') ?? 'unknown',
    version: map.get('VERSION') ?? 'unknown',
    machine: map.get('MACHINE') ?? 'unknown',
    architecture: map.get('ARCHITECTURE') ?? 'unknown',
    cpu: map.get('CPU') ?? 'unknown',
    timezone: map.get('TIMEZONE') ?? 'unknown',
    hostname: map.get('HOSTNAME') ?? 'unknown',
    sysname: map.get('SYSNAME') ?? 'unknown',
    domain: map.get('DOMAIN') ?? 'unknown',
    numSrvcs: map.get('NUM_SRVCS') ?? 'unknown'
  };
}

export async function getPids(host: string, port: number = 8000): Promise<Map<number, ProcessInfo>> {
  const service = await SInfoService.connect(host, port);
  try {
    return await service.getPids();
  } finally {
    await service.disconnect();
  }
}
