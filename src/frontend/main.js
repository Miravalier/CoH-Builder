import { exampleBuild1, exampleBuild2 } from "./modules/example_data.js";
import { Database, LoadEnhDb, LoadI12 } from "./modules/database.js";
import { RetrieveArrayBuffer } from "./modules/requests.js";


document.onreadystatechange = async () => {
    const enhDbBuffer = await RetrieveArrayBuffer("/Data/Homecoming/EnhDB.mhd");
    const i12Buffer = await RetrieveArrayBuffer("/Data/Homecoming/I12.mhd");
    const database = new Database(LoadEnhDb(enhDbBuffer), LoadI12(i12Buffer));

    console.log(database);
    console.log(database.LoadMxdCharacter(exampleBuild2));
}
