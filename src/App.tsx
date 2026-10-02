import { appRoute } from "./lib/paths";
import { Admin } from "./components/Admin";
import { GiftStory } from "./components/GiftStory";
import "./App.css";
export default function App() {
  return ["admin", "admin/index.html"].includes(appRoute()) ? (
    <Admin />
  ) : (
    <GiftStory />
  );
}
