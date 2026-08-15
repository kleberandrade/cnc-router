import { ActionBar } from "./ActionBar";
import { SidePanel } from "./SidePanel";
import { StatusBar } from "./StatusBar";

/**
 * Convenience wrapper rendering all three chrome pieces together
 * (App places them individually in its layout; tests use this).
 */
export function Toolbar() {
  return (
    <>
      <ActionBar />
      <SidePanel />
      <StatusBar />
    </>
  );
}
