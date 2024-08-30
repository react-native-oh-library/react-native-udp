import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
    createSocket(cId:number, options:{type: string}):void;
    bind(cId:number, portNumber:number,addressStr:string,options:{reusePort: { type: string; reusePort?: boolean; debug?: boolean; } },callback:(err:string, addr:{ address:string; port:number;}) => void):void;
    close(cId:number,callback?: (err: string) => void): number | undefined;
    send(cId:number,msg: string, portNumber: number | null, addressStr: string | null,
        callback: ((error?: string) => void)): void ;
    setBroadcast(cId:number,flag: boolean,callback: (err: string | Error | undefined) => void): void;
    addMembership(cId:number, multicastInterface: string): void;
    dropMembership(cId:number, multicastInterface: string): void;
} 

export default TurboModuleRegistry.get<Spec>('ReactNativeUdpSockets') as Spec | null;