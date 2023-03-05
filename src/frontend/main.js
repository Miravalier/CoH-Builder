import { exampleBuild3 } from "./modules/example_data.js";
import { database } from "./modules/database.js";
import { RenderCharacter } from "./modules/render.js";


async function ReadFile(file) {
    return new Promise(function (resolve, reject) {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
            resolve(reader.result);
        });
        reader.addEventListener("error", () => {
            reject("error");
        });
        reader.readAsText(file);
    });
}

let character = null;

function Main() {
    console.log("Database", database);
    window.database = database;

    const loadButton = document.getElementById("midsLoadButton");
    const midsFilePicker = document.getElementById("midsFile");
    const viewStyleSelect = document.getElementById("viewStyle");
    const tooltip = document.getElementById("tooltip");

    tooltip.addEventListener("mouseout", ev => {
        tooltip.style.display = "none";
    });

    loadButton.addEventListener("click", async ev => {
        // Update global character ref
        const midsFile = midsFilePicker.files[0];
        const midsFileContent = await ReadFile(midsFile);
        character = database.LoadMxdCharacter(midsFileContent);
        // Re-render
        console.log("Rendering Character", character);
        RenderCharacter(character, viewStyleSelect.value);
    });

    viewStyleSelect.addEventListener("change", async ev => {
        // Re-render
        console.log("Rendering Character", character);
        RenderCharacter(character, viewStyleSelect.value);
    });
}

if (document.readyState === "complete") {
    Main();
}
else {
    document.onreadystatechange = Main;
}
