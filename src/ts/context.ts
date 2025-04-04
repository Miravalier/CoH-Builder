export type CallbackList = {[label: string]: CallableFunction};


export function addContextOption(element: HTMLElement, label: string, callback: CallableFunction) {
    const elementReference = element as any;
    if (!elementReference.contextCallbacks) {
        elementReference.contextCallbacks = {};
        element.addEventListener("contextmenu", ev => {
            ev.preventDefault();
            ev.stopPropagation();
            const contextCallbacks: CallbackList = elementReference.contextCallbacks;

            const popup = document.createElement("div");
            popup.classList.add("popup");

            const contextMenu = popup.appendChild(document.createElement("div"));
            contextMenu.classList.add("container");
            contextMenu.classList.add("contextmenu");
            
            for (const [label, callback] of Object.entries(contextCallbacks)) {
                const menuItem = contextMenu.appendChild(document.createElement("div"));
                menuItem.classList.add("item");
                menuItem.textContent = label;
                menuItem.addEventListener("click", () => {
                    popup.remove();
                    callback();
                });
            }

            document.body.appendChild(popup);
        });
    }
    elementReference.contextCallbacks[label] = callback;
}