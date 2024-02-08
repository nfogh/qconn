import { SInfoService } from '../sinfoservice';
import { expect, use as chaiUse } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
chaiUse(chaiAsPromised);

describe('sinfoservice', () => {
  describe('getPids', () => {
    it('should get a list of processes', async () => {
      const service = await SInfoService.connect('192.168.23.128');
      try {
        const processes = await service.getPids();
        expect(processes.get(1)?.path).to.equal('proc/boot/procnto-instr');
      } finally {
        await service.disconnect();
      }
    }).timeout(100000);
  });
});
