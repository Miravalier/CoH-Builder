import { StreamReader } from "./streams.js";
import * as Enums from "./enums.js";


export class Database {
    constructor(enhDb, i12) {
        this.enhancements = enhDb.enhancements;
        this.enhancementsByUid = {};
        this.enhancementsBySid = {};
        for (let enhancement of enhDb.enhancements) {
            this.enhancementsByUid[enhancement.uid] = enhancement;
            this.enhancementsBySid[enhancement.staticIndex] = enhancement;
        }
        this.classes = i12.classes;
        this.powersets = i12.powersets;
        this.powers = i12.powers;
        this.powersByUid = {};
        this.powersBySid = {};
        for (let power of i12.powers) {
            this.powersByUid[power.uid] = power;
            this.powersBySid[power.staticIndex] = power;
        }
    }

    /**
     * @brief Loads a character from an MxD save string (Mids' Reborn)
     *
     * @param {String} saveString
     */
    LoadMxdCharacter(saveString) {
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
            character.alignment = stream.readInt32();
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

        const powerEntries = [];
        for (let i = 0; i < powerCount; i++) {
            const powerEntry = {};
            if (qualifiedNames) {
                powerEntry.name = stream.readString();
                powerEntry.power = this.powersByUid[powerEntry.name];
            }
            else {
                powerEntry.id = stream.readInt32();
                powerEntry.power = this.powersBySid[powerEntry.id];
            }

            if (!powerEntry.power) continue;

            powerEntry.level = stream.readInt8();
            powerEntry.statInclude = stream.readBoolean();
            if (version == 32) {
                powerEntry.procInclude = stream.readBoolean();
                powerEntry.variableValue = stream.readInt32();
                powerEntry.inherentSlotsUsed = stream.readInt32();
            }
            else if (version == 31) {
                powerEntry.procInclude = stream.readBoolean();
                powerEntry.variableValue = stream.readInt32();
            }
            else {
                powerEntry.variableValue = stream.readInt32();
            }

            if (hasSubPower) {
                powerEntry.subPowers = [];
                const subPowerCount = stream.readInt8() + 1;
                for (let j = 0; j < subPowerCount; j++) {
                    const subPower = {};
                    if (qualifiedNames) {
                        subPower.name = stream.readString();
                        subPower.power = this.powersByUid[subPower.name];
                    }
                    else {
                        subPower.id = stream.readInt32();
                        subPower.power = this.powersBySid[subPower.id];
                    }
                    subPower.statInclude = stream.readBoolean();
                    if (!subPower.power) continue;
                    powerEntry.subPowers.push(subPower);
                }
            }

            const slots = [];
            const slotCount = stream.readInt8() + 1;
            for (let i = 0; i < slotCount; i++) {
                const slot = {};
                slot.level = stream.readInt8();
                if (version == 32) {
                    slot.inherent = stream.readBoolean();
                }
                slot.enhancement = this.LoadMxdEnhancement(stream, version, qualifiedNames);
                //console.log("Enhancement", slot.enhancement);
                if (stream.readBoolean()) {
                    slot.flippedEnhancement = this.LoadMxdEnhancement(stream, version, qualifiedNames);
                }
                slots.push(slot);
                //console.log("Slot", slot);
            }
            powerEntry.slots = slots;

            powerEntries.push(powerEntry);
            console.log(i, "Power", powerEntry);
        }
        character.powers = powerEntries;
        return character;
    }

    /**
     * @brief Used by the LoadMxd function.
     *
     * @param {StreamReader} stream
     * @param {boolean} qualifiedNames
     */
    LoadMxdEnhancement(stream, version, qualifiedNames) {
        let enhancementInstance = {};
        if (qualifiedNames) {
            const enhancementName = stream.readString();
            enhancementInstance.enhancement = this.enhancementsByUid[enhancementName];
        }
        else {
            const enhancementSid = stream.readInt32();
            enhancementInstance.enhancement = this.enhancementsBySid[enhancementSid];
        }

        if (!enhancementInstance.enhancement) {
            return;
        }

        const typeId = enhancementInstance.enhancement.typeId;
        if (typeId == Enums.ENH_TYPE_NORMAL || typeId == Enums.ENH_TYPE_SPECIAL) {
            enhancementInstance.relativeLevel = reader.readInt8();
            enhancementInstance.grade = reader.readInt8();
        }
        else if (typeId == Enums.ENH_TYPE_IO || typeId == Enums.ENH_TYPE_SET_IO) {
            enhancementInstance.ioLevel = reader.readInt8();
            if (version > 10) {
                enhancementInstance.relativeLevel = reader.readInt8();
            }
        }
        return enhancementInstance;
    }
}


/**
 * @param {StreamReader} stream
 */
function LoadEffect(stream) {
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
            effect.fx = LoadEffect(stream);
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
 * @param {StreamReader} stream
 */
function LoadEnhDbEnhancementSet(stream) {
    const enhancementSet = {};

    enhancementSet.displayName = stream.readString();
    enhancementSet.shortName = stream.readString();
    enhancementSet.uid = stream.readString();
    enhancementSet.description = stream.readString();
    enhancementSet.setType = stream.readInt32();
    enhancementSet.image = stream.readString();
    enhancementSet.minLevel = stream.readInt32();
    enhancementSet.maxLevel = stream.readInt32();

    const enhancementCount = stream.readInt32() + 1;
    enhancementSet.enhancements = [];
    for (let i = 0; i < enhancementCount; i++) {
        enhancementSet.enhancements.push(stream.readInt32());
    }

    const bonusCount = stream.readInt32() + 1;
    enhancementSet.bonuses = [];
    for (let i = 0; i < bonusCount; i++) {
        const bonus = {};
        bonus.special = stream.readInt32();
        bonus.altString = stream.readString();
        bonus.pvMode = stream.readInt32();
        bonus.slotted = stream.readInt32();
        const nameCount = stream.readInt32() + 1;
        bonus.names = [];
        bonus.indexes = [];
        for (let j = 0; j < nameCount; j++) {
            bonus.names.push(stream.readString());
            bonus.indexes.push(stream.readInt32());
        }
        enhancementSet.bonuses.push(bonus);
    }

    const specialBonusCount = stream.readInt32() + 1;
    enhancementSet.specialBonuses = [];
    for (let i = 0; i < specialBonusCount; i++) {
        const specialBonus = {};
        specialBonus.special = stream.readInt32();
        specialBonus.altString = stream.readString();
        const nameCount = stream.readInt32() + 1;
        specialBonus.names = [];
        specialBonus.indexes = [];
        for (let j = 0; j < nameCount; j++) {
            specialBonus.names.push(stream.readString());
            specialBonus.indexes.push(stream.readInt32());
        }
        enhancementSet.specialBonuses.push(specialBonus);
    }

    return enhancementSet;
}


/**
 * @param {StreamReader} stream
 */
function LoadI12Class(stream) {
    const i12Class = {};
    i12Class.displayName = stream.readString();
    i12Class.hitpoints = stream.readInt32();
    i12Class.hitpointCap = stream.readFloat();
    i12Class.description = stream.readString();
    i12Class.resistanceCap = stream.readFloat();
    const originCount = stream.readInt32() + 1;
    i12Class.origins = [];
    for (let i = 0; i < originCount; i++) {
        i12Class.origins.push(stream.readString());
    }
    i12Class.name = stream.readString();
    i12Class.type = stream.readInt32();
    i12Class.column = stream.readInt32();
    i12Class.shortDescription = stream.readString();
    i12Class.primaryGroup = stream.readString();
    i12Class.secondaryGroup = stream.readString();
    i12Class.playable = stream.readBoolean();
    i12Class.rechargeCap = stream.readFloat();
    i12Class.damageCap = stream.readFloat();
    i12Class.recoveryCap = stream.readFloat();
    i12Class.regenCap = stream.readFloat();
    i12Class.baseRecovery = stream.readFloat();
    i12Class.baseRegen = stream.readFloat();
    i12Class.baseThreat = stream.readFloat();
    i12Class.perceptionCap = stream.readFloat();
    return i12Class;
}


/**
 * @param {StreamReader} stream
 */
function LoadI12Powerset(stream) {
    const powerset = {};
    powerset.powers = [];
    powerset.displayName = stream.readString();
    powerset.id = stream.readInt32();
    powerset.type = stream.readInt32();
    powerset.image = stream.readString();
    powerset.fullName = stream.readString();
    if (!powerset.fullName) {
        powerset.fullName = "Orphan." + powerset.displayName.replace(" ", "_");
    }
    powerset.setName = stream.readString();
    powerset.description = stream.readString();
    powerset.subName = stream.readString();
    powerset.archetypeClass = stream.readString();
    powerset.uidTrunkSet = stream.readString();
    powerset.uidLinkSecondary = stream.readString();
    const mutexSetCount = stream.readInt32() + 1;
    powerset.mutexSets = [];
    for (let i = 0; i < mutexSetCount; i++) {
        powerset.mutexSets.push({
            uid: stream.readString(),
            nid: stream.readInt32(),
        });
    }
    return powerset;
}


/**
 * @param {StreamReader} stream
 */
function LoadI12Requirement(stream) {
    const requirement = {};

    requirement.classNames = [];
    const classNameCount = stream.readInt32() + 1;
    for (let i = 0; i < classNameCount; i++) {
        requirement.classNames.push(stream.readString());
    }

    requirement.classNamesNot = [];
    const classNameNotCount = stream.readInt32() + 1;
    for (let i = 0; i < classNameNotCount; i++) {
        requirement.classNamesNot.push(stream.readString());
    }

    requirement.powerIds = [];
    const powerIdCount = stream.readInt32() + 1;
    for (let i = 0; i < powerIdCount; i++) {
        requirement.powerIds.push([
            stream.readString(),
            stream.readString()
        ]);
    }

    requirement.powerIdsNot = [];
    const powerIdNotCount = stream.readInt32() + 1;
    for (let i = 0; i < powerIdNotCount; i++) {
        requirement.powerIdsNot.push([
            stream.readString(),
            stream.readString()
        ]);
    }

    return requirement;
}


/**
 * @param {StreamReader} stream
 */
function LoadI12Power(stream) {
    const power = {};
    power.staticIndex = stream.readInt32();
    power.fullName = stream.readString();
    power.groupName = stream.readString();
    power.setName = stream.readString();
    power.powerName = stream.readString();
    power.displayName = stream.readString();
    power.available = stream.readInt32();
    power.requirement = LoadI12Requirement(stream);
    power.modesRequired = stream.readInt32();
    power.modesDisallowed = stream.readInt32();
    power.type = stream.readInt32();
    power.accuracy = stream.readFloat();
    power.attackTypes = stream.readInt32();
    const groupMembershipCount = stream.readInt32() + 1;
    power.groupMemberships = [];
    for (let i = 0; i < groupMembershipCount; i++) {
        power.groupMemberships.push(stream.readString());
    }
    power.entitiesAffected = stream.readInt32();
    power.entitiesAutoHit = stream.readInt32();
    power.target = stream.readInt32();
    power.targetLos = stream.readBoolean();
    power.range = stream.readFloat();
    power.targetSecondary = stream.readInt32();
    power.rangeSecondary = stream.readFloat();
    power.endCost = stream.readFloat();
    power.interruptTime = stream.readFloat();
    power.castTime = stream.readFloat();
    power.rechargeTime = stream.readFloat();
    power.baseRechargeTime = stream.readFloat();
    power.activatePeriod = stream.readFloat();
    power.effectArea = stream.readInt32();
    power.radius = stream.readFloat();
    power.arc = stream.readInt32();
    power.maxTargets = stream.readInt32();
    power.maxBoosts = stream.readString();
    power.castFlags = stream.readInt32();
    power.aiReport = stream.readInt32();
    power.numCharges = stream.readInt32();
    power.usageTime = stream.readInt32();
    power.lifeTime = stream.readInt32();
    power.lifeTimeInGame = stream.readInt32();
    power.numAllowed = stream.readInt32();
    power.doNotSave = stream.readBoolean();

    const boostsAllowedCount = stream.readInt32() + 1;
    power.boostsAllowed = [];
    for (let i = 0; i < boostsAllowedCount; i++) {
        power.boostsAllowed.push(stream.readString());
    }

    power.castThroughHold = stream.readBoolean();
    power.ignoreStrength = stream.readBoolean();
    power.descriptionShort = stream.readString();
    power.description = stream.readString();

    const enhancementCount = stream.readInt32() + 1;
    power.enhancements = [];
    for (let i = 0; i < enhancementCount; i++) {
        power.enhancements.push(stream.readInt32());
    }

    const setTypeCount = stream.readInt32() + 1;
    power.setTypes = new Set();
    for (let i = 0; i < setTypeCount; i++) {
        power.setTypes.add(stream.readInt32());
    }

    power.clickBuff = stream.readBoolean();
    power.alwaysToggle = stream.readBoolean();
    power.level = stream.readInt32();
    power.allowFrontLoading = stream.readBoolean();
    power.variableEnabled = stream.readBoolean();
    power.variableOverride = stream.readBoolean();
    power.variableName = stream.readString();
    power.variableMin = stream.readInt32();
    power.variableMax = stream.readInt32();

    const subPowerUidCount = stream.readInt32() + 1;
    power.subPowerUids = [];
    for (let i = 0; i < subPowerUidCount; i++) {
        power.subPowerUids.push(stream.readString());
    }

    const ignoreEnhancementCount = stream.readInt32() + 1;
    power.ignoreEnhancements = [];
    for (let i = 0; i < ignoreEnhancementCount; i++) {
        power.ignoreEnhancements.push(stream.readInt32());
    }

    const ignoreBuffCount = stream.readInt32() + 1;
    power.ignoreBuffs = [];
    for (let i = 0; i < ignoreBuffCount; i++) {
        power.ignoreBuffs.push(stream.readInt32());
    }

    power.skipMax = stream.readBoolean();
    power.inherentType = stream.readInt32();
    power.displayLocation = stream.readInt32();
    power.mutexAuto = stream.readBoolean();
    power.mutexIgnore = stream.readBoolean();
    power.absorbSummonEffects = stream.readBoolean();
    power.absorbSummonAttributes = stream.readBoolean();
    power.showSummonAnyway = stream.readBoolean();
    power.neverAutoUpdate = stream.readBoolean();
    power.neverAutoUpdateRequirements = stream.readBoolean();
    power.includeFlag = stream.readBoolean();
    power.forcedClass = stream.readString();
    power.sortOverride = stream.readBoolean();
    power.boostBoostable = stream.readBoolean();
    power.boostUsePlayerLevel = stream.readBoolean();

    const effectCount = stream.readInt32() + 1;
    power.effects = [];
    for (let i = 0; i < effectCount; i++) {
        const effect = LoadEffect(stream);
        effect.power = power;
        power.effects.push(effect);
    }

    power.hiddenPower = stream.readBoolean();
    power.active = stream.readBoolean();
    power.taken = stream.readBoolean();
    power.stacks = stream.readInt32();
    power.variableStart = stream.readInt32();

    return power;
}


/**
 * @param {StreamReader} stream
 */
function LoadI12Summons(stream) {
    const summons = {};
    return summons;
}


/**
 * @brief Loads a list of powers from the Mids' Reborn powers database.
 *
 * @param {ArrayBufferLike} buffer
 */
export function LoadI12(buffer) {
    const db = {};
    const stream = new StreamReader(buffer);

    const fileHeader = stream.readString();
    console.log("Header:", fileHeader);

    const version = stream.readString();
    console.log("Version:", version);

    const year = stream.readInt32();
    if (year > 0) {
        const month = stream.readInt32();
        const day = stream.readInt32();
    }
    else {
        const dateTimestamp = stream.readInt64();
    }

    db.issue = stream.readInt32();
    db.pageVol = stream.readInt32();
    db.pageVolText = stream.readString();

    const archtypeHeader = stream.readString();
    const classCount = stream.readInt32() + 1;
    db.classes = [];
    for (let i = 0; i < classCount; i++) {
        db.classes.push(LoadI12Class(stream));
    }

    const powersetHeader = stream.readString();
    const powersetCount = stream.readInt32() + 1;
    db.powersets = [];
    for (let i = 0; i < powersetCount; i++) {
        db.powersets.push(LoadI12Powerset(stream));
    }

    const powersHeader = stream.readString();
    const powersCount = stream.readInt32() + 1;
    db.powers = [];
    for (let i = 0; i < powersCount; i++) {
        db.powers.push(LoadI12Power(stream));
    }

    const summonsHeader = stream.readString();
    db.summons = LoadI12Summons(stream);

    return db;
}


/**
 * @brief Loads a list of enhancements and enhancement sets from the Mids' Reborn enhancement database.
 *
 * @param {ArrayBufferLike} buffer
 */
export function LoadEnhDb(buffer) {
    const db = {};
    const stream = new StreamReader(buffer);

    const header = stream.readString();
    const deprecatedField = stream.readFloat();

    const enhancementCount = stream.readInt32() + 1;
    db.enhancements = [];
    for (let i = 0; i < enhancementCount; i++) {
        const enhancement = LoadEnhDbEnhancement(stream);
        db.enhancements.push(enhancement);
    }

    const enhancementSetCount = stream.readInt32() + 1;
    db.enhancementSets = [];
    for (let i = 0; i < enhancementSetCount; i++) {
        const enhancementSet = LoadEnhDbEnhancementSet(stream);
        db.enhancementSets.push(enhancementSet);
    }

    return db;
}
