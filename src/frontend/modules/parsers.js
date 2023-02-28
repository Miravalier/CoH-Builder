import { StreamReader } from "./streams.js";
import * as Enums from "./enums.js";


/**
 * @brief Loads a character from an MxD save string (Mids' Reborn)
 *
 * @param {String} saveString
 */
export function LoadMxd(saveString) {
    const character = {};

    saveString = saveString.replace(/[\s|]+/g, "");

    const stringParts = saveString.split(";");
    if (stringParts.length != 6) {
        throw new Error("Invalid save str format, wrong number of semicolons");
    }
    const [magic, inflatedSize, compressedSize, unknownSize, encoding, bodyString] = stringParts;

    if (bodyString.length & 1) {
        throw new Error("Invalid save str format, odd number of hex characters");
    }

    const byteArray = new Uint8Array(bodyString.length / 2);
    for (let i = 0; i < bodyString.length; i += 2) {
        byteArray[i / 2] = parseInt(bodyString.slice(i, i + 2), 16);
    }

    /** @type {Uint8Array} */
    const inflatedArray = pako.inflate(byteArray);
    console.log("ArrayBuffer", inflatedArray);

    let hexdebug = "";
    for (let i = 0; i < inflatedArray.length; i++) {
        hexdebug += inflatedArray[i].toString(16).padStart(2, '0') + " ";
    }
    console.log("Whole Buffer", hexdebug);

    const stream = new StreamReader(inflatedArray.buffer);
    stream.readBytes(4); // Magic bytes

    const version = Math.round(stream.readFloat() * 10);
    console.log(`Version: ${version}`);

    if (version > 32) {
        throw new Error(`MxD version too new, ${version} > 3.2`);
    }

    const qualifiedNames = stream.readBoolean();
    console.log(`Qualified Names: ${qualifiedNames ? "True" : "False"}`);

    const hasSubPower = stream.readBoolean();
    console.log(`Has Sub Power: ${hasSubPower ? "True" : "False"}`);

    character.class = stream.readString();
    console.log(`Class: ${character.class}`);

    character.origin = stream.readString();
    console.log(`Origin: ${character.origin}`);

    character.alignment = Enums.ALIGNMENT_HERO;
    if (version > 10) {
        character.alignment = stream.readUint32();
    }
    console.log(`Alignment: ${character.alignment}`);

    character.name = stream.readString();
    console.log(`Name: ${character.name}`);

    const powerSetCount = stream.readInt32() + 1;
    character.powerSets = [];
    for (let i = 0; i < powerSetCount; i++) {
        character.powerSets.push(stream.readString());
    }
    console.log("Power Sets", character.powerSets);

    const lastPowerIndex = stream.readInt32() - 1;
    console.log("Last Power Index", lastPowerIndex);
    const powerCount = stream.readInt32() + 1;
    console.log("Power Count", powerCount);

    const powers = [];
    for (let i = 0; i < powerCount; i++) {
        console.log(i);
        hexdebug = "";
        for (let i = stream.offset; i < inflatedArray.length; i++) {
            hexdebug += inflatedArray[i].toString(16).padStart(2, '0') + " ";
        }
        //console.log("Remaining Buffer", hexdebug);
        const power = {};
        if (qualifiedNames) {
            power.name = stream.readString();
        }
        else {
            power.id = stream.readUint32();
        }

        power.level = stream.readUint8();
        power.statInclude = stream.readBoolean();
        if (version == 32) {
            power.procInclude = stream.readBoolean();
            power.variableValue = stream.readInt32();
            power.inherentSlotsUsed = stream.readInt32();
        }
        else if (version == 31) {
            power.procInclude = stream.readBoolean();
            power.variableValue = stream.readInt32();
        }
        else {
            power.variableValue = stream.readInt32();
        }

        if (hasSubPower) {
            power.subPowers = [];
            const subPowerCount = stream.readInt8() + 1;
            for (let j = 0; j < subPowerCount; j++) {
                const subPower = {};
                if (qualifiedNames) {
                    subPower.name = stream.readString();
                }
                else {
                    subPower.id = stream.readUint32();
                }
                subPower.statInclude = stream.readBoolean();
                power.subPowers.push(subPower);
            }
        }

        powers.push(power);
        console.log("Power", power);
    }
    character.powers = powers;

    const slots = [];
    const slotCount = stream.readInt8() + 1;
    for (let i = 0; i < slotCount; i++) {
        const slot = {};
        slot.level = stream.readInt8();
        if (version == 32) {
            slot.inherent = stream.readBoolean();
        }
        slot.enhancement = ReadEnhancement(stream, qualifiedNames);
        console.log("Enhancement", slot.enhancement);
        if (stream.readBoolean()) {
            slot.flippedEnhancement = ReadEnhancement(stream, qualifiedNames);
        }
        slots.push(slot);
    }
    character.slots = slots;

    return character;
}


/**
 * @brief Used by the LoadMxd function.
 *
 * @param {StreamReader} stream
 * @param {boolean} qualifiedNames
 */
function ReadEnhancement(stream, qualifiedNames) {
    const enhancement = {};
    if (qualifiedNames) {
        enhancement.name = stream.readString();
    }
    else {
        enhancement.id = stream.readInt32();
    }
    enhancement.unkValue1 = reader.readInt8();
    enhancement.unkValue2 = reader.readInt8();
    return enhancement;
}


/**
 * @brief Loads a list of enhancement sets from the Mids' Reborn enhancement database.
 *
 * @param {ArrayBufferLike} buffer
 */
export function LoadEnhDB(buffer) {
    const db = {};
    const stream = new StreamReader(buffer);

    const header = stream.readString();
    console.log("Header", header);

    return db;
}
