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


function Main() {
    console.log("Database", database);
    window.database = database;

    const loadButton = document.getElementById("midsLoadButton");
    const midsFilePicker = document.getElementById("midsFile");

    loadButton.addEventListener("click", async ev => {
        const midsFile = midsFilePicker.files[0];
        const midsFileContent = await ReadFile(midsFile);
        const character = database.LoadMxdCharacter(midsFileContent);
        console.log("Character", character);
        RenderCharacter(character);
    });



}

if (document.readyState === "complete") {
    Main();
}
else {
    document.onreadystatechange = Main;
}
