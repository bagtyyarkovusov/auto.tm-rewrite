
import { SearchScreen } from "../../../src/listings/search/SearchScreen";
import { TabScreen } from "../../../components/navigation/TabScreen";

export default function SearchRoute() {
  return (
    // Search pins its own bar above the tab bar and brings the fade under it.
    <TabScreen edgeFade={false}>
      <SearchScreen />
    </TabScreen>
  );
}
