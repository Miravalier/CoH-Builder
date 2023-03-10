import { database } from "./database.js";
import * as Enums from "./enums.js";


function RenderEnhancementTooltip(powerEntry, enhancement) {
    let enhancementName = enhancement.name;
    if (enhancement.uidSet) {
        enhancementName = `${enhancement.uidSet.replaceAll("_", " ")}: ${enhancementName}`;
    }

    //console.log("Enhancement", enhancement);
    //console.log("PowerEntry", powerEntry);

    let enhancementDescription = "";
    const enhancementSet = database.enhancementSetsByUid[enhancement.uidSet];
    if (enhancementSet) {
        //console.log("Enhancement Set", enhancementSet);
        let enhancementsInSet = 0;
        for (let slot of powerEntry.slots) {
            if (!slot.enhancement) {
                continue;
            }
            if (slot.enhancement.enhancement.uidSet == enhancementSet.uid) {
                enhancementsInSet += 1;
            }
        }

        const effectStrings = [];
        let requirementCount = 1;
        for (let bonus of enhancementSet.bonuses) {
            for (let boostName of bonus.names) {
                const boost = database.powersByUid[boostName];
                if (boost.setName != "PVP_Set_Bonus") {
                    requirementCount += 1;
                }
                if (enhancementsInSet >= requirementCount) {
                    effectStrings.push(`<div class="active">(${requirementCount}) ${boost.description}</div>`);
                }
                else {
                    effectStrings.push(`<div class="inactive">(${requirementCount}) ${boost.description}</div>`);
                }
                //console.log("Enh Boost Power", boost);
            }
        }
        enhancementDescription = effectStrings.join("");
    }

    return `
        <div class="enhancementName">${enhancementName}</div>
        <div class="enhancementDescription">${enhancementDescription}</div>
    `
}


function RenderSlots(power, viewStyle) {
    const htmlElements = [];
    for (let slot of power.slots) {
        if (!slot.enhancement) {
            htmlElements.push(`
                <div class="slot box">
                    <div class="enhancementName">
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
            if (viewStyle != "compact") {
                enhancementLevel = `(${enhancementLevel})`;
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
                <div class="slot box" data-enhancement="${slot.enhancement.enhancement.uid}" data-power="${power.id}">
                    <img class="enhancementFrame" src="/Images/Overlay/${frame}" alt="Enhancement Frame" width="32" height="32">
                    <img class="enhancementIcon" src="/Images/Enhancements/${image}" alt="${enhancementName}" width="32" height="32">
                    <div class="enhancementLevel">
                        ${enhancementLevel}
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


function RenderPowers(character, viewStyle) {
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
        let powerLevel = "";
        if (viewStyle == "compact") {
            powerLevel = power.level + 1;
        } else {
            powerLevel = `Level ${power.level + 1}:`;
        }

        htmlElements.push(`
            <div class="power box">
                <div class="powerHeader">
                    <div class="powerLevel">
                        ${powerLevel}
                    </div>
                    <div class="powerName">
                        ${power.power.displayName}
                    </div>
                </div>
                <div class="slots">
                    ${RenderSlots(power, viewStyle)}
                </div>
            </div>
        `);
    }
    return htmlElements.join("\n");
}


export function RenderCharacter(character, viewStyle) {
    const display = document.getElementById("mainDisplay");
    display.innerHTML = "";

    const _class = database.classesByUid[character.class];

    display.insertAdjacentHTML("afterbegin", `
        <div class="character box ${viewStyle}">
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
                ${RenderPowers(character, viewStyle)}
            </div>
        </div>
    `);

    const tooltip = document.getElementById("tooltip");

    for (let slot of display.querySelectorAll(".character .slot")) {
        slot.addEventListener("mouseover", ev => {
            const power = character.powersById[ev.target.dataset.power];
            if (!power) {
                return;
            }
            const enhancement = database.enhancementsByUid[ev.target.dataset.enhancement];
            if (!enhancement) {
                return;
            }

            if (ev.clientX > document.body.clientWidth / 2) {
                tooltip.style.left = null;
                tooltip.style.right = document.body.clientWidth - ev.pageX;
            }
            else {
                tooltip.style.left = ev.pageX;
                tooltip.style.right = null;
            }

            if (ev.clientY > document.body.clientHeight / 2) {
                tooltip.style.top = null;
                tooltip.style.bottom = document.body.clientHeight - ev.pageY;
            }
            else {
                tooltip.style.top = ev.pageY;
                tooltip.style.bottom = null;
            }

            tooltip.style.display = "flex";

            tooltip.innerHTML = "";
            tooltip.insertAdjacentHTML("afterbegin", RenderEnhancementTooltip(power, enhancement));
        });

        slot.addEventListener("mouseout", ev => {
            if (ev.toElement !== tooltip) {
                tooltip.style.display = "none";
            }
        });
    }
}
