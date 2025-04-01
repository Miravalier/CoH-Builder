async function Main() {
    console.log("[!] Loading CoH-Builder ...");

    document.body.addEventListener("contextmenu", ev => {
        ev.preventDefault();
    });

    console.log("[!] Loading Complete");
}


window.addEventListener("load", Main);
