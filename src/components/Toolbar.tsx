import { TopBar } from "./TopBar";
import { SidePanel } from "./SidePanel";
import { StatusBar } from "./StatusBar";

/**
 * Convenience wrapper rendering all three chrome pieces (TopBar, SidePanel, StatusBar) together
 * (App places them individually in its layout; tests use this).
 */
export function Toolbar() {
  return (
    <>
      <TopBar />
      <SidePanel />
      <StatusBar />
    </>
  );
}
