import { exampleBuild1, exampleBuild2 } from "./modules/example_data.js";
import { LoadEnhDB } from "./modules/parsers.js";
import { RetrieveFile } from "./modules/requests.js";

//console.log(LoadMxd(exampleBuild2));
document.onreadystatechange = async () => {
    const buffer = await RetrieveFile("/Data/Homecoming/EnhDB.mhd");
    console.log(LoadEnhDB(buffer));
}
