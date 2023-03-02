export class StreamReader {
    /**
     * @param {ArrayBufferLike} buffer
     */
    constructor(buffer) {
        this.view = new DataView(buffer);
        this.offset = 0;
    }

    readInt8() {
        const result = this.view.getInt8(this.offset);
        this.offset += 1;
        return result;
    }

    readUint8() {
        const result = this.view.getUint8(this.offset);
        this.offset += 1;
        return result;
    }

    readInt16() {
        const result = this.view.getInt16(this.offset, true);
        this.offset += 2;
        return result;
    }

    readUint16() {
        const result = this.view.getUint16(this.offset, true);
        this.offset += 2;
        return result;
    }

    readInt32() {
        const result = this.view.getInt32(this.offset, true);
        this.offset += 4;
        return result;
    }

    readUint32() {
        const result = this.view.getUint32(this.offset, true);
        this.offset += 4;
        return result;
    }

    readInt64() {
        const result = this.view.getBigInt64(this.offset, true);
        this.offset += 8;
        return result;
    }

    readUint64() {
        const result = this.view.getBigUint64(this.offset, true);
        this.offset += 8;
        return result;
    }

    readBoolean() {
        const byte = this.view.getUint8(this.offset);
        this.offset += 1;
        return byte != 0;
    }

    readFloat() {
        const result = this.view.getFloat32(this.offset, true);
        this.offset += 4;
        return result;
    }

    readDouble() {
        const result = this.view.getFloat64(this.offset, true);
        this.offset += 4;
        return result;
    }

    readLEB128() {
        let result = 0;
        let bytes = 0;
        while (true) {
            const byte = this.readUint8();
            result += ((byte & 127) << (bytes * 7));
            if ((byte & 128) == 0) {
                break;
            }
            bytes += 1;
        }
        return result;
    }

    readBytes(count) {
        const result = new Uint8Array(count);
        for (let i = 0; i < count; i++) {
            result[i] = this.readUint8();
        }
        return result;
    }

    readString() {
        let result = "";
        const length = this.readLEB128();
        for (let i = 0; i < length; i++) {
            result += String.fromCharCode(this.readUint8());
        }
        return result;
    }
}
