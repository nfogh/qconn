import { LauncherService } from '../launcherservice';
import { expect, use as chaiUse } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
chaiUse(chaiAsPromised);

const ip = "192.168.23.128";

describe('fileservice', () => {
  describe('executeCommand', () => {
    it('should return the expected result', async () => {
      const service = await LauncherService.connect(ip);
      try {
        const echoOutput = await service.execute('/bin/echo', ['hello', 'world']);
        expect(echoOutput).to.equal('hello world\n');
      } finally {
        await service.disconnect();
      }
    }).timeout(100000);
  });
});
