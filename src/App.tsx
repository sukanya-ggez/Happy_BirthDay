import { Admin } from "./components/Admin";
import { GiftStory } from "./components/GiftStory";
import "./App.css";
export default function App() {
  return location.pathname.replace(/\/$/, "") === "/admin" ? (
    <Admin />
  ) : (
    <GiftStory />
  );
}
