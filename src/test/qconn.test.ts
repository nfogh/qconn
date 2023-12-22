import * as qconn from '../qconn';
import { expect, use as chaiUse } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
chaiUse(chaiAsPromised);

describe('qconn', () => {
  describe('getInfo', () => {
    it('should get info from system', async () => {
      const info = await qconn.getInfo('192.168.23.128');

      expect(info.endian).to.equal('le');
      expect(info.hasVersion).to.equal('1');
      expect(info.qconnVersion).to.equal('1.4.207944');
      expect(info.os).to.equal('nto');
      expect(info.release).to.equal('6.4.1');
      expect(info.version).to.equal('2009/05/20-17:35:31EDT');
      expect(info.machine).to.equal('x86pc');
      expect(info.architecture).to.equal('x86');
      expect(info.cpu).to.equal('x86');
      expect(info.timezone).to.equal('UTC00');
      expect(info.hostname).to.equal('localhost');
      expect(info.sysname).to.equal('QNX');
      expect(info.domain).to.equal('localdomain');
      expect(info.numSrvcs).to.equal('1');
    }).timeout(100000);
  });
});
