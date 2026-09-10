import { redirect } from "next/navigation";
import { ULTRA_CANVAS_PATH } from "@/lib/ultra-canvas-path";

/** Legacy /ultra-2 → primary Ultra canvas. */
export default function UltraCanvas2RedirectPage() {
  redirect(ULTRA_CANVAS_PATH);
}
