import { FileService, Permissions, OpenFlags } from '../fileservice';
import { expect, use as chaiUse } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
chaiUse(chaiAsPromised);

describe('fileservice', () => {
  describe('stat', () => {
    it('should return the expected result', async () => {
      await using service = await FileService.connect('192.168.23.128');
      const fd = await service.open('/bin/sh', OpenFlags.O_RDONLY);
      const stat = await service.stat(fd);
      await service.close(fd);

      expect(stat.mode).to.equal(Permissions.S_IFREG | Permissions.S_IRUSR | Permissions.S_IWUSR | Permissions.S_IXUSR | Permissions.S_IRGRP | Permissions.S_IXGRP | Permissions.S_IROTH | Permissions.S_IXOTH);
      expect(stat.size).to.equal(211840);
    }).timeout(100000);
  });

  describe('list', () => {
    it('should return the expected result', async () => {
      await using service = await FileService.connect('192.168.23.128');
      const dirList = await service.list('/');

      expect(dirList).to.include.members(['.boot', 'boot', 'home', 'lib', 'bin', 'root', 'etc', 'usr', 'var', 'tmp', 'sbin', 'opt', '.diskroot', 'proc', 'fs', 'dev']);
      expect(dirList).not.to.include.members(['..', '.']);
    }).timeout(100000);
  });

  describe('mkDir', () => {
    it('should be able to create a directory if one doesnt exist', async () => {
      {
        await using service = await FileService.connect('192.168.23.128');
        await service.open('/tmp/mytestdir', OpenFlags.O_CREAT | OpenFlags.O_WRONLY, Permissions.S_IFDIR | Permissions.S_IRUSR | Permissions.S_IWUSR);
      }
      {
        await using service = await FileService.connect('192.168.23.128');
        const dirList = await service.list('/tmp');
        expect(dirList).to.include.members(['mytestdir']);

        await service.delete('/tmp/mytestdir'); // cleanup
      }
    }).timeout(100000);
  });

  describe('mkDir', () => {
    it('should not be able to create a directory if it already exists', async () => {
      {
        await using service = await FileService.connect('192.168.23.128');
        await expect((async () => {
          await service.open('/tmp', OpenFlags.O_CREAT | OpenFlags.O_WRONLY, Permissions.S_IFDIR | Permissions.S_IRUSR | Permissions.S_IWUSR);
        })()).to.be.rejectedWith(Error);
      }
    }).timeout(100000);
  });

  describe('readFile', () => {
    it('should be able to read /bin/sh', async () => {
      {
        await using service = await FileService.connect('192.168.23.128');
        const fd = await service.open('/bin/sh', OpenFlags.O_RDONLY);
        const fileData = await service.readAll(fd);
        await service.close(fd);
        expect(fileData.length).to.equal(211840);
        expect(fileData.subarray(1, 4)).to.contain(Buffer.from('ELF'));
      }
    }).timeout(100000);
  });

  describe('writeFile', () => {
    it('should create a file', async () => {
      {
        await using service = await FileService.connect('192.168.23.128');
        const fdWrite = await service.open('/tmp/myfile.txt', OpenFlags.O_CREAT | OpenFlags.O_WRONLY, Permissions.S_IRUSR | Permissions.S_IWUSR);
        await service.write(fdWrite, Buffer.from('Filedata'));
        await service.close(fdWrite);

        const fdRead = await service.open('/tmp/myfile.txt', OpenFlags.O_RDONLY);
        const fileData = await service.readAll(fdRead);
        await service.close(fdRead);
        await service.delete('/tmp/myfile.txt'); // cleanup
        expect(fileData.toString()).to.equal('Filedata');
      }
    }).timeout(100000);
  });

  it('should overwrite file when file exists and overwrite flag is set', async () => {
    {
      await using service = await FileService.connect('192.168.23.128');
      const fd = await service.open('/tmp/myfile.txt', OpenFlags.O_CREAT | OpenFlags.O_WRONLY | OpenFlags.O_TRUNC, Permissions.S_IRUSR | Permissions.S_IWUSR);
      await service.write(fd, Buffer.from('Filedata'));
      await service.close(fd);
    }
    await expect((async () => {
      await using service = await FileService.connect('192.168.23.128');
      const fd = await service.open('/tmp/myfile.txt', OpenFlags.O_CREAT | OpenFlags.O_WRONLY | OpenFlags.O_TRUNC, Permissions.S_IRUSR | Permissions.S_IWUSR);
      await service.close(fd);
      await service.delete('/tmp/myfile.txt'); // cleanup
    })()).not.to.be.rejectedWith(Error);
  }).timeout(100000);

  it('should fail if file doesnt exist, and create mode is not set', async () => {
    await expect((async () => {
      await using service = await FileService.connect('192.168.23.128');
      const fd = await service.open('/tmp/myfile.txt', OpenFlags.O_WRONLY, Permissions.S_IRUSR | Permissions.S_IWUSR);
      await service.close(fd);
    })()).to.be.rejectedWith(Error);
  }).timeout(100000);
});
