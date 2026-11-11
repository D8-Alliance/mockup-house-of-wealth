import { crc32, deflateRawSync } from 'zlib';

export interface ZipEntry {
  /** The file's name inside the archive (UTF-8, may hold folders with "/"). */
  name: string;
  data: Buffer;
}

/** MS-DOS date and time, as zip headers keep them (local time, two-second steps). */
function dosDateTime(at: Date) {
  const time = (at.getHours() << 11) | (at.getMinutes() << 5) | Math.floor(at.getSeconds() / 2);
  const date = ((Math.max(at.getFullYear(), 1980) - 1980) << 9) | ((at.getMonth() + 1) << 5) | at.getDate();
  return { time, date };
}

/**
 * A plain zip archive of the given files. Each file is deflated, or stored as it is when deflating does not make it
 * smaller (a PDF usually is compressed already), so the bytes inside stay exactly the original: a signed PDF keeps
 * its seal. No zip64: for archives under 4 GB, which is all this platform builds.
 */
export function buildZip(entries: ZipEntry[], at = new Date()): Buffer {
  const { time, date } = dosDateTime(at);
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const deflated = deflateRawSync(entry.data);
    const stored = deflated.length >= entry.data.length;
    const body = stored ? entry.data : deflated;
    const method = stored ? 0 : 8;
    const crc = crc32(entry.data) >>> 0;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // file name is UTF-8
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, name, body);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(entry.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    // extra length, comment length, disk number, internal and external attributes: all zero.
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);

    offset += local.length + name.length + body.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}
