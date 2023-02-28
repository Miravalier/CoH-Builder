import { exampleBuild1, exampleBuild2 } from "./modules/example_data.js";
import { LoadEnhDB } from "./modules/parsers.js";
import { RetrieveBinary } from "./modules/requests.js";

//console.log(LoadMxd(exampleBuild2));
document.onreadystatechange = async () => {
    const blob = await RetrieveBinary("/data/")
    console.log(LoadEnhDB(blob));
}
