import { redirect } from "next/navigation";
import { ULTRA_CANVAS_PATH } from "@/lib/ultra-canvas-path";

/** Legacy /pro URL — permanent redirect to Ultra canvas. */
export default function ProPageRedirect() {
  redirect(ULTRA_CANVAS_PATH);
}
