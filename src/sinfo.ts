import { argv } from "process";
import { SInfoService } from "./sinfoservice";

const host = argv[2] ?? '192.168.23.128';
const port = parseInt(argv[3] ?? '8000');
const infoType = argv[4] ?? "sysinfo";
const pid = parseInt(argv[5] ?? '1');
SInfoService.connect(host, port).then(async service => {
    try {
        switch (infoType) {
            case 'sysinfo':
                console.log(await service.getSysInfo());
                break;
            case 'pids':
                console.dir(await service.getPids(), { 'maxArrayLength': null });
                break;
            case 'mmaps':
                console.dir(await service.getMMaps(pid), { 'maxArrayLength': null });
                break;
        }
    } finally {
        await service.disconnect();
    }
});
