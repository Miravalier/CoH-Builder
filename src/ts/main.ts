import * as CoH from "./coh";


async function Main() {
    console.log("[!] Loading CoH-Builder ...");

    // Display loading indicator
    const loadingIndicator = document.body.appendChild(document.createElement("p"));
    loadingIndicator.classList.add("loading-indicator");
    loadingIndicator.textContent = "Loading ..."
    document.body.style.cursor = "wait";

    // Prevent right click menu
    document.body.addEventListener("contextmenu", ev => {
        ev.preventDefault();
    });

    await CoH.init();
    console.log("[!] Loading Complete");

    // Hide Loading Indicator
    loadingIndicator.remove();
    document.body.style.cursor = "";

    // Render page
    for (const {classData, primaries, secondaries} of Object.values(CoH.classes)) {
        const groupContainer = document.body.appendChild(document.createElement("div"));
        groupContainer.classList.add("container");
        groupContainer.classList.add("group");

        groupContainer.appendChild(CoH.objectToHtml(classData));
        groupContainer.appendChild(CoH.objectToHtml(primaries));
        groupContainer.appendChild(CoH.objectToHtml(secondaries));
    }
}


window.addEventListener("load", Main);
