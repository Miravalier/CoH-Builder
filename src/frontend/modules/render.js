import { database } from "./database.js";
import * as Enums from "./enums.js";

function RenderSlots(power) {
    const htmlElements = [];
    for (let slot of power.slots) {
        if (!slot.enhancement) {
            htmlElements.push(`
                <div class="slot box">
                    <div class="emptySlot">
                        <span class="grey">Empty Slot</span>
                    </div>
                </div>
            `);
        }
        else {
            let enhancementName = slot.enhancement.enhancement.name;
            if (slot.enhancement.enhancement.uidSet) {
                enhancementName = `${slot.enhancement.enhancement.uidSet.replaceAll("_", " ")}: ${enhancementName}`;
            }
            let enhancementLevel = "N/A";
            if (slot.enhancement.ioLevel) {
                enhancementLevel = slot.enhancement.ioLevel + 1;
            }
            else if (slot.enhancement.relativeLevel) {
                enhancementLevel = `+${slot.enhancement.relativeLevel}`;
            }
            const image = slot.enhancement.enhancement.image;
            const typeId = slot.enhancement.enhancement.typeId;
            let frame = "Inc.png";
            if (typeId == Enums.ENH_TYPE_SET_IO || typeId == Enums.ENH_TYPE_IO) {
                frame = "IO.png";
            }
            else if (typeId == Enums.ENH_TYPE_SPECIAL) {
                frame = "HO.png";
            }
            htmlElements.push(`
                <div class="slot box">
                    <img class="enhancementFrame" src="/Images/Overlay/${frame}" alt="Enhancement Frame" width="32" height="32">
                    <img class="enhancementIcon" src="/Images/Enhancements/${image}" alt="${enhancementName}" width="32" height="32">
                    <div class="enhancementLevel">
                        (${enhancementLevel})
                    </div>
                    <div class="enhancementName">
                        ${enhancementName}
                    </div>
                </div>
            `);
        }
    }
    return htmlElements.join("\n");
}

function RenderPowers(character) {
    const powers = Array.from(character.powers);
    powers.sort((a, b) => {
        if (a.level == b.level) {
            return 0;
        }
        else if (a.level < b.level) {
            return -1;
        }
        else {
            return 1;
        }
    });
    const htmlElements = [];
    for (let power of powers) {
        console.log(power);
        htmlElements.push(`
            <div class="power box">
                <div class="powerHeader">
                    <div class="powerLevel">
                        Level ${power.level + 1}:
                    </div>
                    <div class="powerName">
                        ${power.power.displayName}
                    </div>
                </div>
                <div class="slots">
                    ${RenderSlots(power)}
                </div>
            </div>
        `);
    }
    return htmlElements.join("\n");
}


export function RenderCharacter(character) {
    const display = document.getElementById("mainDisplay");
    display.innerHTML = "";

    const _class = database.classesByUid[character.class];

    display.insertAdjacentHTML("afterbegin", `
        <div class="character box">
            <div class="characterHeader">
                <div class="field characterName">
                    <span class="label">Name</span>
                    <span class="entry">${character.name}</span>
                </div>
                <div class="field characterClass">
                    <span class="label">Class</span>
                    <span class="entry">${_class.displayName}</span>
                </div>
            </div>
            <div class="powers">
                ${RenderPowers(character)}
            </div>
        </div>
    `);
}
