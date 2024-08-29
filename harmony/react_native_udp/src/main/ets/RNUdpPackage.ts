import { RNPackage, TurboModulesFactory } from "@rnoh/react-native-openharmony/ts";
import type { TurboModule, TurboModuleContext } from "@rnoh/react-native-openharmony/ts";
import { TM } from "@rnoh/react-native-openharmony/generated/ts";
import { RNUdpTurboModule } from "./RNUdpTurboModule";
class RNUdpTurboModuleFactory extends TurboModulesFactory {
    createTurboModule(name: string): TurboModule | null {
        if (this.hasTurboModule(name)) {
            return new RNUdpTurboModule(this.ctx);
        }
        return null;
    }
    hasTurboModule(name: string): boolean {
        return name === TM.ReactNativeUdpSockets.NAME;
    }
}
export class RNUdpPackage extends RNPackage {
    createTurboModulesFactory(ctx: TurboModuleContext): TurboModulesFactory {
        return new RNUdpTurboModuleFactory(ctx);
    }
}
