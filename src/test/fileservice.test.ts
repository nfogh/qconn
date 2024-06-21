import { FileService, Permissions, OpenFlags, FileServiceError } from '../fileservice';
import { expect, use as chaiUse } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
chaiUse(chaiAsPromised);

const ip = "192.168.23.128";

describe('fileservice', () => {
  describe('stat', () => {
    it('should return the expected result', async () => {
      const service = await FileService.connect(ip);
      try {
        const fd = await service.open('/bin/sh', OpenFlags.O_RDONLY);
        try {
          const stat = await service.stat(fd);
          expect(stat.mode).to.equal(Permissions.S_IFREG | Permissions.S_IRUSR | Permissions.S_IWUSR | Permissions.S_IXUSR | Permissions.S_IRGRP | Permissions.S_IXGRP | Permissions.S_IROTH | Permissions.S_IXOTH);
          expect(stat.size).to.equal(211840);
        } finally {
          await service.close(fd);
        }
      } finally {
        await service.disconnect();
      }
    }).timeout(100000);
  });

  describe('list', () => {
    it('should return the expected result', async () => {
      const service = await FileService.connect(ip);
      try {
        const dirList = await service.list('/');

        expect(dirList).to.include.members(['.boot', 'boot', 'home', 'lib', 'bin', 'root', 'etc', 'usr', 'var', 'tmp', 'sbin', 'opt', '.diskroot', 'proc', 'fs', 'dev']);
        expect(dirList).not.to.include.members(['..', '.']);
      } finally {
        await service.disconnect();
      }
    }).timeout(100000);
  });

  describe('mkDir', () => {
    it('should be able to create a directory if one doesnt exist', async () => {
      {
        const service = await FileService.connect(ip);
        try {
          await service.open('/tmp/mytestdir', OpenFlags.O_CREAT | OpenFlags.O_WRONLY, Permissions.S_IFDIR | Permissions.S_IRUSR | Permissions.S_IWUSR);
        } finally {
          await service.disconnect();
        }
      }
      {
        const service = await FileService.connect(ip);
        try {
          const dirList = await service.list('/tmp');
          expect(dirList).to.include.members(['mytestdir']);
        } finally {
          try {
            await service.delete('/tmp/mytestdir'); // cleanup
          } catch { }
          await service.disconnect();
        }
      }
    }).timeout(100000);
  });

  describe('mkDir', () => {
    it('should not be able to create a directory if it already exists', async () => {
      const service = await FileService.connect(ip);
      try {
        await expect((async () => {
          await service.open('/tmp', OpenFlags.O_CREAT | OpenFlags.O_WRONLY, Permissions.S_IFDIR | Permissions.S_IRUSR | Permissions.S_IWUSR);
        })()).to.be.rejectedWith(Error);
      } finally {
        await service.disconnect();
      }
    }).timeout(100000);
  });

  describe('readFile', () => {
    it('should be able to read /bin/sh', async () => {
      const service = await FileService.connect(ip);
      try {
        const fd = await service.open('/bin/sh', OpenFlags.O_RDONLY);
        try {
          const fileData = await service.readAll(fd);
          expect(fileData.length).to.equal(211840);
          expect(fileData.subarray(1, 4)).to.contain(Buffer.from('ELF'));
        } finally {
          await service.close(fd);
        }
      } finally {
        service.disconnect();
      }
    }).timeout(100000);
  });

  describe('writeFile', () => {
    it('should create a file', async () => {
      const service = await FileService.connect(ip);
      try {
        const fdWrite = await service.open('/tmp/myfile.txt', OpenFlags.O_CREAT | OpenFlags.O_WRONLY, Permissions.S_IRUSR | Permissions.S_IWUSR);
        try {
          await service.write(fdWrite, Buffer.from('Filedata'));
        } finally {
          await service.close(fdWrite);
        }

        const fdRead = await service.open('/tmp/myfile.txt', OpenFlags.O_RDONLY);
        try {
          const fileData = await service.readAll(fdRead);
          expect(fileData.toString()).to.equal('Filedata');
        } finally {
          await service.close(fdRead);
        }
      } finally {
        try {
          await service.delete('/tmp/myfile.txt'); // cleanup
        } catch { }
        service.disconnect();
      }
    }).timeout(100000);
  });

  it('should overwrite file when file exists and overwrite flag is set', async () => {
    {
      const service = await FileService.connect(ip);
      try {
        const fd = await service.open('/tmp/myfile.txt', OpenFlags.O_CREAT | OpenFlags.O_WRONLY | OpenFlags.O_TRUNC, Permissions.S_IRUSR | Permissions.S_IWUSR);
        try {
          await service.write(fd, Buffer.from('Filedata'));
        } finally {
          await service.close(fd);
        }
      } finally {
        await service.disconnect();
      }
    }

    await expect((async () => {
      const service = await FileService.connect(ip);
      try {
        const fd = await service.open('/tmp/myfile.txt', OpenFlags.O_CREAT | OpenFlags.O_WRONLY | OpenFlags.O_TRUNC, Permissions.S_IRUSR | Permissions.S_IWUSR);
        await service.close(fd);
        await service.delete('/tmp/myfile.txt'); // cleanup
      } finally {
        await service.disconnect();
      }
    })()).not.to.be.rejectedWith(FileServiceError);
  }).timeout(100000);

  it('should fail if file doesnt exist, and create mode is not set', async () => {
    await expect((async () => {
      const service = await FileService.connect(ip);
      try {
        const fd = await service.open('/tmp/myfile.txt', OpenFlags.O_WRONLY, Permissions.S_IRUSR | Permissions.S_IWUSR);
        await service.close(fd);
      } finally {
        service.disconnect();
      }
    })()).to.be.rejectedWith(FileServiceError);
  }).timeout(100000);
});
