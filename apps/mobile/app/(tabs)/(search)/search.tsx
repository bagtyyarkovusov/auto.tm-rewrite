
import { SearchScreen } from "../../../src/listings/search/SearchScreen";
import { TabScreen } from "../../../components/navigation/TabScreen";

export default function SearchRoute() {
  return (
    <TabScreen>
      <SearchScreen />
    </TabScreen>
  );
}
