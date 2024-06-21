import { SInfoService } from '../sinfoservice';
import { expect, use as chaiUse } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
chaiUse(chaiAsPromised);

const ip = "192.168.23.128";

describe('sinfoservice', () => {
  describe('getPids', () => {
    it('should get a list of processes', async () => {
      const service = await SInfoService.connect(ip);
      try {
        const processes = await service.getPids();
        expect(processes.get(1)?.path).to.equal('proc/boot/procnto-instr');
      } finally {
        await service.disconnect();
      }
    }).timeout(100000);
  });

  describe('getMMaps', () => {
    it('should get mmap', async () => {
      const service = await SInfoService.connect(ip);
      try {
        const mmap = await service.getMMaps(1);
        const procntoInstr = mmap.filter(m => m.path === 'proc/boot/procnto-instr');
        expect(procntoInstr.length).to.be.equal(2);
        expect(procntoInstr[0].size).to.be.equal(BigInt(498972));
        expect(procntoInstr[0].offset).to.be.equal(BigInt(0));
        expect(procntoInstr[1].size).to.be.equal(BigInt(33068));
        expect(procntoInstr[1].offset).to.be.equal(BigInt(499712));
      } finally {
        await service.disconnect();
      }
    });
  });

  describe('getSysInfo', () => {
    it('should get system info', async () => {
      const service = await SInfoService.connect(ip);
      try {
        const sysinfo = await service.getSysInfo();

        expect(sysinfo.hostname).to.equal('localhost');
        expect(sysinfo.memTotal === BigInt(267974656)).to.be.true;
        expect(sysinfo.memFree <= sysinfo.memTotal).to.be.true;

        const sysinfo2 = await service.getSysInfo();

        expect(sysinfo2.hostname).to.equal('localhost');
        expect(sysinfo2.memTotal === BigInt(267974656)).to.be.true;
        expect(sysinfo2.memFree <= sysinfo2.memTotal).to.be.true;
      } finally {
        await service.disconnect();
      }
    }).timeout(100000);
  });
});
