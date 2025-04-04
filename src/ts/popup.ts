import { Future } from "./async";


export async function getValue(key: string, value: string): Promise<string> {
    const result = new Future<string>();

    const popup = document.createElement("div");
    popup.classList.add("popup");

    const container = popup.appendChild(document.createElement("div"));
    container.classList.add("container");

    const attribute = container.appendChild(document.createElement("div"));
    attribute.classList.add("attribute");

    const attributeKey = attribute.appendChild(document.createElement("div"));
    attributeKey.classList.add("key");
    attributeKey.textContent = key;

    const attributeValue = attribute.appendChild(document.createElement("input"));
    attributeValue.classList.add("value");
    attributeValue.value = value;

    const buttonRow = container.appendChild(document.createElement("row"));

    const saveButton = buttonRow.appendChild(document.createElement("button"));
    saveButton.textContent = "Save";
    saveButton.addEventListener("click", () => {
        result.resolve(attributeValue.value);
        popup.remove();
    });

    const cancelButton = buttonRow.appendChild(document.createElement("button"));
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", () => {
        popup.remove();
        result.resolve(value);
    });

    document.body.appendChild(popup);
    return await result;
}