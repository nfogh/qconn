import * as qconn from '../qconn'
import { expect, use as chaiUse } from 'chai';
import * as chaiAsPromised from 'chai-as-promised'
chaiUse(chaiAsPromised);

describe('qconn', () => {
  describe('getInfo', () => {
    it('should get info from system', async () => {
      const info = await qconn.getInfo('192.168.23.128')

      expect(info.get('ENDIAN')).to.equal('le')
      expect(info.get('HASVERSION')).to.equal('1')
      expect(info.get('QCONN_VERSION')).to.equal('1.4.207944')
      expect(info.get('OS')).to.equal('nto')
      expect(info.get('RELEASE')).to.equal('6.4.1')
      expect(info.get('VERSION')).to.equal('2009/05/20-17:35:31EDT')
      expect(info.get('MACHINE')).to.equal('x86pc')
      expect(info.get('ARCHITECTURE')).to.equal('x86')
      expect(info.get('CPU')).to.equal('x86')
      expect(info.get('TIMEZONE')).to.equal('UTC00')
      expect(info.get('HOSTNAME')).to.equal('localhost')
      expect(info.get('SYSNAME')).to.equal('QNX')
      expect(info.get('DOMAIN')).to.equal('localdomain')
      expect(info.get('NUM_SRVCS')).to.equal('1')
    }).timeout(100000)
  })
})
