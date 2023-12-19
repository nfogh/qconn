import { LauncherService } from '../launcherservice'
import { expect, use as chaiUse } from 'chai';
import * as chaiAsPromised from 'chai-as-promised'
chaiUse(chaiAsPromised);

describe('fileservice', () => {
  describe('executeCommand', () => {
    it('should return the expected result', async () => {
      await using service = await LauncherService.connect('192.168.23.128')
      const echoOutput = await service.execute('/bin/echo', ['hello', 'world']);
      expect(echoOutput).to.equal('hello world\n')
    }).timeout(100000)
  })
})
