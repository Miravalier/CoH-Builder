export function RenderCharacter(character) {
    const display = document.getElementById("mainDisplay");
    display.innerHTML = "";

    const characterDiv = document.createElement("div");
    display.append(characterDiv);

    characterDiv.append(document.createTextNode(character.name));

    return characterDiv;
}
