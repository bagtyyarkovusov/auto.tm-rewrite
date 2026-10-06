import type { DemoPhoto } from "./manifest";

export interface PhotoSource {
  load(photo: DemoPhoto): Promise<Buffer>;
}
