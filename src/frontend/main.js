import { exampleBuild1, exampleBuild2 } from "./modules/example_data.js";
import { LoadEnhDb } from "./modules/parsers.js";
import { RetrieveArrayBuffer } from "./modules/requests.js";


document.onreadystatechange = async () => {
    const buffer = await RetrieveArrayBuffer("/Data/Homecoming/EnhDB.mhd");
    console.log("Database Size:", buffer.byteLength);
    console.log(LoadEnhDb(buffer));
    //console.log(LoadMxdCharacter(exampleBuild2));
}
