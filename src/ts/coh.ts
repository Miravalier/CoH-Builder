import * as popup from "./popup";
import { addContextOption } from "./context";


export const baseUrl = "/CoH-Data";


export type DataObject = {
    dataType: string,
    label: string,
    parent: DataObject,
    attributes: {[key: string]: string},
    children: {[key: string]: DataObject[]},
};


const openBraceMissingScopes = new Set(["ModTable", "Powers"]);
const closeBraceMissingScopes = new Set(["Powers"]);
const nonIndentingScopes = new Set(["Powers"]);


class DataParser {
    scopeStack: DataObject[];
    workingObject: DataObject;
    storedLine: [string, string];

    constructor() {
        this.scopeStack = [];
        this.workingObject = {dataType: null, label: null, parent: null, attributes: {}, children: {}};
        this.storedLine = null;
    }

    tokenize(line: string): [string, string] {
        let i = 0;

        // Walk until the first white-space character is found
        while (i < line.length && !/\s/.test(line[i])) {
            i++;
        }
        const spaceStart = i;

        // Walk until the next non-whitespace character is found
        while (i < line.length && /\s/.test(line[i])) {
            i++;
        }
        const spaceEnd = i;

        return [line.substring(0, spaceStart), line.substring(spaceEnd) || null];
    }

    ingest(line: [string, string]) {
        // Check for the start of a scope
        if (line[0] == "{") {
            this.startScope(this.storedLine[0], this.storedLine[1]);
            this.storedLine = null;
        }
        // Check for the end of a scope
        else if (line[0] == "}") {
            // Parse the last line of the scoped block
            if (this.storedLine !== null) {
                this.parse(this.storedLine[0], this.storedLine[1]);
            }
            this.storedLine = null;
            // End any newline closeable scopes if we've forgotten the trailing empty line
            while (closeBraceMissingScopes.has(this.workingObject.dataType)) {
                this.endScope();
            }
            // End the normal scope
            this.endScope();
        }
        // Process the stored line and store this one in its place
        else if (this.storedLine !== null) {
            this.parse(this.storedLine[0], this.storedLine[1]);
            this.storedLine = line;
        }
        // Nothing stored, keep moving before deciding
        else {
            this.storedLine = line;
        }
    }

    startScope(scopeType: string, scopeLabel: string) {
        // If we try to open a scope while already in a close-brace-less one, end that scope first.
        // This means braceless scopes can't be nested, hopefully thats fine
        if (closeBraceMissingScopes.has(this.workingObject.dataType)) {
            this.endScope();
        }

        this.scopeStack.push(this.workingObject);
        const subObjectList = this.workingObject.children[scopeType] || [];
        this.workingObject.children[scopeType] = subObjectList;

        const newObject = {parent: this.workingObject, dataType: scopeType, label: scopeLabel, attributes: {}, children: {}};
        subObjectList.push(newObject);
        this.workingObject = newObject;
    }

    endScope() {
        if (this.scopeStack.length == 0) {
            throw Error("too many '}' in data file");
        }
        this.workingObject = this.scopeStack.pop();
    }

    parse(key: string, value: string) {
        // Some scopes can be closed by an empty line
        if (key == "") {
            if (closeBraceMissingScopes.has(this.workingObject.dataType)) {
                this.endScope()
            }
        }
        // e.g. Mod Tables do not start with a curly brace, (but do end with one)
        // so we need to manually open a scope sometimes
        else if (openBraceMissingScopes.has(key)) {
            this.startScope(key, value);
        }
        // Just a standard key-value pair
        else {
            this.workingObject.attributes[key] = value;
        }
    }
}


export async function loadObject(path: string): Promise<DataObject> {
    console.log(`[!] Loading ${path}`);
    const parser = new DataParser();
    const response = await fetch(`${baseUrl}/${path}`);
    const text = await response.text();
    for (let line of text.split("\n")) {
        // Strip out whitespace
        line = line.trim();
        // Ignore comments
        if (line.startsWith("//")) {
            continue;
        }
        // Feed lines into the parser
        parser.ingest(parser.tokenize(line));
    }
    // Parse the last line if the file ends with a global attr
    if (parser.storedLine) {
        parser.parse(...parser.storedLine);
        parser.storedLine = null;
    }
    // Make sure scopes have all been closed
    while (parser.scopeStack.length != 0) {
        parser.endScope();
    }
    // Return the root object
    parser.workingObject.label = path;
    return parser.workingObject;
}


export function serializeObject(obj: DataObject, indent: number = 0): string {
    let result = "";

    // Serialize the name of the object
    if (obj.dataType !== null) {
        result += "\t".repeat(indent) + obj.dataType;
        if (obj.label !== null) {
            result += " " + obj.label;
        }
        result += "\r\n";
    }

    // Add a brace if this scope uses opening braces
    if (obj.dataType !== null && !openBraceMissingScopes.has(obj.dataType)) {
        result += "\t".repeat(indent) + "{\r\n";
    }

    if (obj.dataType !== null && !nonIndentingScopes.has(obj.dataType)) {
        indent += 1;
    }

    // Serialize all of the raw attributes
    for (const [key, value] of Object.entries(obj.attributes)) {
        result += "\t".repeat(indent) + `${key} ${value}\r\n`;
    }
    result += "\r\n";

    // Serialize all of the subobjects
    for (const child of Object.values(obj.children)) {
        for (const subObject of child) {
            result += serializeObject(subObject, indent);
        }
    }

    if (obj.dataType !== null && !nonIndentingScopes.has(obj.dataType)) {
        indent -= 1;
    }

    if (obj.dataType !== null && !closeBraceMissingScopes.has(obj.dataType)) {
        result += "\t".repeat(indent) + "}\r\n";
    }

    return result;
}


export async function saveObject(obj: DataObject) {
    let cursor = obj;
    while (cursor.parent) {
        cursor = cursor.parent;
    }

    console.log(cursor.label);
    console.log(serializeObject(obj));
}


const classDataFiles = {
    "Blaster": "Defs/classes/PC_Blaster.def",
    "Controller": "Defs/classes/PC_Controller.def",
    "Defender": "Defs/classes/PC_Defender.def",
    "Peacebringer": "Defs/classes/PC_Peacebringer.def",
    "Scrapper": "Defs/classes/PC_Scrapper.def",
    "Tanker": "Defs/classes/PC_Tanker.def",
    "Warshade": "Defs/classes/PC_Warshade.def",

    "Arachnos Soldier": "Defs/classes/V_PC_Arachnos_Soldier.def",
    "Arachnos Widow": "Defs/classes/V_PC_Arachnos_Widow.def",
    "Brute": "Defs/classes/V_PC_Brute.def",
    "Corruptor": "Defs/classes/V_PC_Corruptor.def",
    "Dominator": "Defs/classes/V_PC_Dominator.def",
    "Mastermind": "Defs/classes/V_PC_Mastermind.def",
    "Stalker": "Defs/classes/V_PC_Stalker.def",
};

export const classes: {[className: string]: {
    classData: DataObject,
    primaries: DataObject,
    secondaries: DataObject,
}} = {};
export const powerSets: {[powerSetName: string]: DataObject} = {};
export const villainDefs: {[entName: string]: DataObject} = {};


export async function init() {
    const powerFiles = await (await fetch(`${baseUrl}/Defs/powers/`)).json();

    async function loadPowerFile(name: string): Promise<DataObject> {
        for (const powerFile of powerFiles) {
            if (powerFile.name.toLowerCase() == name.toLowerCase()) {
                return (await loadObject(`Defs/powers/${powerFile.name}`));
            }
        }
        throw Error(`failed to find power file '${name}'`);
    }

    // Load Mastermind Pet Defs and Powers
    for (const villainDef of (await loadObject("Defs/villains/MastermindPets.villain")).children["VillainDef"])
    {
        villainDefs[villainDef.label.replaceAll('"', '')] = villainDef;
    }

    for (const powerFile of powerFiles) {
        const comparisonName = powerFile.name.toLowerCase() as string;
        if (comparisonName.startsWith("mastermind_pets_") && comparisonName.endsWith(".powers")) {
            const powerSet = await loadObject(`Defs/powers/${powerFile.name}`);
            let powerSetLabel: string = null;
            for (const power of powerSet.children["Power"]) {
                const labelComponents = power.label.split(".");
                labelComponents.pop();
                const potentialLabel = labelComponents.join(".");
                if (powerSetLabel !== null && powerSetLabel != potentialLabel) {
                    throw Error(`multiple powersets found in ${powerFile.name}`);
                }
                powerSetLabel = potentialLabel;
            }
            if (powerSetLabel === null) {
                throw Error(`no powerset found in ${powerFile.name}`);
            }
            powerSets[powerSetLabel] = powerSet;
        }
    }

    // Load Classes
    for (const [className, classDataFile] of Object.entries(classDataFiles)) {
        const classContainer = await loadObject(classDataFile);
        const cohClass = classContainer.children["Class"][0];
        const primaryCategoryName = cohClass.attributes['PrimaryCategory'].replaceAll('"', '');
        const secondaryCategoryName = cohClass.attributes['SecondaryCategory'].replaceAll('"', '');

        classes[className] = {
            classData: cohClass,
            primaries: await loadPowerFile(`${primaryCategoryName}.powersets`),
            secondaries: await loadPowerFile(`${secondaryCategoryName}.powersets`),
        };

        for (const powerset of classes[className].primaries.children["PowerSet"])
        {
            const powersetName = powerset.attributes.Name.replaceAll('"', '');
            powerSets[powerset.label] = await loadPowerFile(`${primaryCategoryName}_${powersetName}.powers`);
        }

        for (const powerset of classes[className].secondaries.children["PowerSet"])
        {
            const powersetName = powerset.attributes.Name.replaceAll('"', '');
            powerSets[powerset.label] = await loadPowerFile(`${secondaryCategoryName}_${powersetName}.powers`);
        }
    }

    console.log("Classes:", classes);
    console.log("PowerSets:", powerSets);
    console.log("Villain Defs:", villainDefs);
}


function resolveObjectContent(object: DataObject, contentDiv: HTMLDivElement) {
    // Append sub-containers
    for (const value of Object.values(object.children)) {
        for (const subObject of value) {
            contentDiv.appendChild(objectToHtml(subObject));
        }
    }

    // Resolve references
    if (object.dataType == "Powers" && object.parent.dataType == "PowerSet") {
        const powerSet = powerSets[object.parent.label];
        for (const power of powerSet.children["Power"]) {
            if (power.label.toLowerCase() == object.label.toLowerCase()) {
                contentDiv.appendChild(objectToHtml(power));
            }
        }
    }
    if (object.dataType == "AttribMod" && object.attributes["Attrib"] == "kEntCreate") {
        const petDef = villainDefs[object.attributes["EntityDef"]];
        if (petDef) {
            contentDiv.appendChild(objectToHtml(petDef));
        }
    }
    if (object.dataType == "VillainDef" && object.attributes["Power"]) {
        const powerSetComponents = object.attributes["Power"].replaceAll('"', '').split(" ");
        powerSetComponents.pop();
        const powerSetLabel = powerSetComponents.join(".");
        const powerSet = powerSets[powerSetLabel];
        if (powerSet) {
            for (const power of powerSet.children["Power"]) {
                contentDiv.appendChild(objectToHtml(power));
            }
        }
    }
    if (object.dataType == "AttribMod" && object.attributes["Attrib"] == "kGrantPower") {
        const powerSetComponents = object.attributes["Reward"].split(".");
        powerSetComponents.pop();
        const powerSetLabel = powerSetComponents.join(".");
        const powerSet = powerSets[powerSetLabel];
        if (powerSet) {
            for (const power of powerSet.children["Power"]) {
                if (power.label == object.attributes["Reward"]) {
                    contentDiv.appendChild(objectToHtml(power));
                }
            }
        }
    }
}


export function objectToHtml(object: DataObject): HTMLDivElement {
    // Create container
    const container = document.createElement("div");
    container.classList.add("container");
    container.classList.add("collapsed");
    if (object.dataType !== null) {
        container.classList.add(object.dataType.toLowerCase());
        if (object.label !== null) {
            container.dataset.label = object.label;
        }
    }
    else {
        container.classList.add("file");
        container.dataset.path = object.label;
    }

    // Add header to container
    const header = container.appendChild(document.createElement("div"));
    header.classList.add("header");
    if (object.dataType === null) {
        header.textContent = `File ${object.label}`;
    }
    else if (object.label !== null) {
        header.textContent = `${object.dataType} ${object.label}`;
    }
    else {
        header.textContent = `${object.dataType}`;
    }

    // Add collapsible content to container
    const contentDiv = document.createElement("div");
    contentDiv.classList.add("content");

    // Append attributes
    for (const [key, value] of Object.entries(object.attributes)) {
        let parent: HTMLDivElement;
        if (key.toLowerCase() == "name") {
            parent = container;
        }
        else {
            parent = contentDiv;
        }
        const attribute = parent.appendChild(document.createElement("div"));
        attribute.classList.add("attribute");

        const attributeKey = attribute.appendChild(document.createElement("div"));
        attributeKey.classList.add("key");
        attributeKey.textContent = key;

        const attributeValue = attribute.appendChild(document.createElement("div"));
        attributeValue.classList.add("value");
        attributeValue.textContent = value;
        if (value == "kTrue" || value == "kFalse") {
            addContextOption(attributeValue, "Set to False", () => {
                object.attributes[key] = "kFalse";
                attributeValue.textContent = "kFalse";
            });
            addContextOption(attributeValue, "Set to True", () => {
                object.attributes[key] = "kTrue";
                attributeValue.textContent = "kTrue";
            });
        }
        else {
            addContextOption(attributeValue, "Edit Value", async () => {
                object.attributes[key] = await popup.getValue(key, object.attributes[key]);
                attributeValue.textContent = object.attributes[key];
            });
        }
        addContextOption(attributeValue, "Cancel", () => {});
    }

    // Append content after any non-collapsible attributes have been added
    container.appendChild(contentDiv);

    // Attach event listeners
    let resolved = false;
    container.addEventListener("click", ev => {
        ev.stopPropagation();
        if (!resolved) {
            resolveObjectContent(object, contentDiv);
            resolved = true;
        }
        container.classList.toggle("collapsed");
    });

    return container;
}