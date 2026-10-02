import { createRoot } from "react-dom/client";
import { Component } from "react";
import type { ReactNode } from "react";
import "@fontsource/noto-sans-thai/400.css";
import "@fontsource/noto-sans-thai/500.css";
import "@fontsource/noto-sans-thai/600.css";
import "@fontsource/caveat/400.css";
import "@fontsource/caveat/600.css";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/500-italic.css";
import App from "./App";
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="state-page">
        <h1>เปิดหน้านี้ไม่สำเร็จ</h1>
        <p>ลองรีเฟรชหน้าเว็บ หากยังไม่สำเร็จให้ตรวจการตั้งค่าตาม README</p>
        <button onClick={() => location.reload()}>รีเฟรช</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
