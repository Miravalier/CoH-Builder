import { StreamReader } from "./streams.js";
import * as Enums from "./enums.js";


/**
 * @brief Loads a character from an MxD save string (Mids' Reborn)
 *
 * @param {String} saveString
 */
export function LoadMxdCharacter(saveString) {
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
        slot.enhancement = ReadMxdEnhancement(stream, qualifiedNames);
        console.log("Enhancement", slot.enhancement);
        if (stream.readBoolean()) {
            slot.flippedEnhancement = ReadMxdEnhancement(stream, qualifiedNames);
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
function ReadMxdEnhancement(stream, qualifiedNames) {
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


function LoadEnhDbEffect(stream) {
    const effect = {};
    effect.powerFullName = stream.readString();
    effect.uniqueId = stream.readInt32();
    effect.effectClass = stream.readInt32();
    effect.effectType = stream.readInt32();
    effect.damageType = stream.readInt32();
    effect.mezType = stream.readInt32();
    effect.modifiesEffectType = stream.readInt32();
    effect.summon = stream.readString();
    effect.delayedTime = stream.readFloat();
    effect.ticks = stream.readInt32();
    effect.stacking = stream.readInt32();
    effect.baseProbability = stream.readFloat();
    effect.suppresion = stream.readInt32();
    effect.buffable = stream.readBoolean();
    effect.resistable = stream.readBoolean();
    effect.specialCase = stream.readInt32();
    effect.variableModifiedOverride = stream.readBoolean();
    effect.ignoreScaling = stream.readBoolean();
    effect.pvMode = stream.readInt32();
    effect.toWhom = stream.readInt32();
    effect.displayPercentageOverride = stream.readInt32();
    effect.scale = stream.readFloat();
    effect.nMagnitude = stream.readFloat();
    effect.nDuration = stream.readFloat();
    effect.attribType = stream.readInt32();
    effect.aspect = stream.readInt32();
    effect.modifierTable = stream.readString();
    effect.nearGround = stream.readBoolean();
    effect.cancelOnMiss = stream.readBoolean();
    effect.requiresHitCheck = stream.readBoolean();
    effect.uidClassName = stream.readString();
    effect.nidClassName = stream.readInt32();
    effect.expressions = {
        duration: stream.readString(),
        magnitude: stream.readString(),
        probability: stream.readString(),
    };
    effect.reward = stream.readString();
    effect.effectId = stream.readString();
    effect.ignoreEd = stream.readBoolean();
    effect.override = stream.readString();
    effect.procsPerMinute = stream.readFloat();
    effect.powerAttribs = stream.readInt32();
    effect.atrOrigAccuracy = stream.readFloat();
    effect.atrOrigActivatePeriod = stream.readFloat();
    effect.atrOrigArc = stream.readInt32();
    effect.atrOrigCastTime = stream.readFloat();
    effect.atrOrigEffectArea = stream.readInt32();
    effect.atrOrigEnduranceCost = stream.readFloat();
    effect.atrOrigInterruptTime = stream.readFloat();
    effect.atrOrigMaxTargets = stream.readInt32();
    effect.atrOrigRadius = stream.readFloat();
    effect.atrOrigRange = stream.readFloat();
    effect.atrOrigRechargeTime = stream.readFloat();
    effect.atrOrigSecondaryRange = stream.readFloat();
    effect.atrModAccuracy = stream.readFloat();
    effect.atrModActivatePeriod = stream.readFloat();
    effect.atrModArc = stream.readInt32();
    effect.atrModCastTime = stream.readFloat();
    effect.atrModEffectArea = stream.readInt32();
    effect.atrModEnduranceCost = stream.readFloat();
    effect.atrModInterruptTime = stream.readFloat();
    effect.atrModMaxTargets = stream.readInt32();
    effect.atrModRadius = stream.readFloat();
    effect.atrModRange = stream.readFloat();
    effect.atrModRechargeTime = stream.readFloat();
    effect.atrModSecondaryRange = stream.readFloat();
    const conditionalCount = stream.readInt32();
    effect.conditionals = {};
    for (let i = 0; i < conditionalCount; i++) {
        const conditionalKey = stream.readString();
        const conditionalValue = stream.readString();
        effect.conditionals[conditionalKey] = conditionalValue;
    }
    return effect;
}


/**
 * @param {StreamReader} stream
 */
function LoadEnhDbEnhancement(stream) {
    const enhancement = {};
    enhancement.recipeIndex = -1;
    enhancement.staticIndex = stream.readInt32();
    enhancement.name = stream.readString();
    enhancement.shortName = stream.readString();
    enhancement.description = stream.readString();
    enhancement.typeId = stream.readInt32();
    enhancement.subtypeId = stream.readInt32();
    const classIdCount = stream.readInt32() + 1;
    enhancement.classes = [];
    for (let i = 0; i < classIdCount; i++) {
        enhancement.classes.push(stream.readInt32());
    }
    enhancement.image = stream.readString();
    enhancement.nidSet = stream.readInt32();
    enhancement.uidSet = stream.readString();
    enhancement.effectChance = stream.readFloat();
    enhancement.minLevel = stream.readInt32();
    enhancement.maxLevel = stream.readInt32();
    enhancement.unique = stream.readBoolean();
    enhancement.mutExId = stream.readInt32();
    if (enhancement.mutExId < Enums.ENH_MUTEX_NONE) {
        enhancement.mutExId = Enums.ENH_MUTEX_NONE;
    }
    enhancement.buffMode = stream.readInt32();
    const effectCount = stream.readInt32() + 1;
    enhancement.effects = [];
    for (let i = 0; i < effectCount; i++) {
        const effect = {};
        effect.mode = stream.readInt32();
        effect.buffMode = stream.readInt32();
        effect.enhancementId = stream.readInt32();
        effect.enhancementSubId = stream.readInt32();
        effect.schedule = stream.readInt32();
        effect.multiplier = stream.readFloat();
        if (!stream.readBoolean()) {
            effect.fx = null;
        }
        else {
            effect.fx = LoadEnhDbEffect(stream);
        }
        enhancement.effects.push(effect);
    }
    enhancement.uid = stream.readString();
    enhancement.recipeName = stream.readString();
    enhancement.superior = stream.readBoolean();
    enhancement.isProc = stream.readBoolean();
    enhancement.isScalable = stream.readBoolean();
    return enhancement;
}

/**
 * @param {StreamReader} reader
 */
function LoadEnhDbEnhancementSet(reader) {
    const enhancementSet = {};

    enhancementSet.displayName = reader.readString();
    enhancementSet.shortName = reader.readString();
    enhancementSet.uid = reader.readString();
    enhancementSet.description = reader.readString();
    enhancementSet.setType = reader.readInt32();
    enhancementSet.image = reader.readString();
    enhancementSet.minLevel = reader.readInt32();
    enhancementSet.maxLevel = reader.readInt32();

    const enhancementCount = reader.readInt32() + 1;
    enhancementSet.enhancements = [];
    for (let i = 0; i < enhancementCount; i++) {
        enhancementSet.enhancements.push(reader.readInt32());
    }

    const bonusCount = reader.readInt32() + 1;
    enhancementSet.bonuses = [];
    for (let i = 0; i < bonusCount; i++) {
        const bonus = {};
        bonus.special = reader.readInt32();
        bonus.altString = reader.readString();
        bonus.pvMode = reader.readInt32();
        bonus.slotted = reader.readInt32();
        const nameCount = reader.readInt32() + 1;
        bonus.names = [];
        bonus.indexes = [];
        for (let j = 0; j < nameCount; j++) {
            bonus.names.push(reader.readString());
            bonus.indexes.push(reader.readInt32());
        }
        enhancementSet.bonuses.push(bonus);
    }

    const specialBonusCount = reader.readInt32() + 1;
    enhancementSet.specialBonuses = [];
    for (let i = 0; i < specialBonusCount; i++) {
        const specialBonus = {};
        specialBonus.special = reader.readInt32();
        specialBonus.altString = reader.readString();
        const nameCount = reader.readInt32() + 1;
        specialBonus.names = [];
        specialBonus.indexes = [];
        for (let j = 0; j < nameCount; j++) {
            specialBonus.names.push(reader.readString());
            specialBonus.indexes.push(reader.readInt32());
        }
        enhancementSet.specialBonuses.push(specialBonus);
    }

    return enhancementSet;
}


/**
 * @brief Loads a list of enhancement sets from the Mids' Reborn enhancement database.
 *
 * @param {ArrayBufferLike} buffer
 */
export function LoadEnhDb(buffer) {
    const db = {};
    const stream = new StreamReader(buffer);

    const header = stream.readString();
    console.log(`Header: ${header}`);

    const unknownField = stream.readFloat();
    console.log(`Unknown Field: ${unknownField}`);

    const enhancementCount = stream.readInt32() + 1;
    db.enhancements = [];
    for (let i = 0; i < enhancementCount; i++) {
        const enhancement = LoadEnhDbEnhancement(stream);
        console.log(`Enhancement ${i}/${enhancementCount}:`, enhancement);
        db.enhancements.push(enhancement);
    }

    const enhancementSetCount = stream.readInt32() + 1;
    db.enhancementSets = [];
    for (let i = 0; i < enhancementSetCount; i++) {
        const enhancementSet = LoadEnhDbEnhancementSet(stream);
        console.log(`EnhancementSet ${i}/${enhancementSetCount}:`, enhancementSet);
        db.enhancementSets.push(enhancementSet);
    }

    return db;
}
