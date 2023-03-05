export function GenerateID() {
    const array = new BigUint64Array(1);
    crypto.getRandomValues(array);
    return array[0].toString();
}


export async function ReadFile(file) {
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
