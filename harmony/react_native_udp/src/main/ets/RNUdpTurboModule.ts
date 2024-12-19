/**
 * MIT License
 *
 * Copyright (C) 2024 Huawei Device Co., Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/*
 * Copyright (c) 2024 Huawei Device Co., Ltd. All rights reserved
 * Use of this source code is governed by a MIT license that can be
 * found in the LICENSE file.
 */

import { TurboModule } from "@rnoh/react-native-openharmony/ts";
import type { TM } from '@rnoh/react-native-openharmony/generated/ts';
import { socket } from '@kit.NetworkKit';
import { BusinessError } from '@kit.BasicServicesKit';
import Logger from "./Logger";


export class RNUdpTurboModule extends TurboModule implements TM.ReactNativeUdpSockets.Spec {
    private clientMap: Map<number, socket.MulticastSocket>;
    constructor(ctx) {
        super(ctx);
        this.clientMap = new Map<number, socket.MulticastSocket>();
    }
    bind(cId: number, portNumber: number, addressStr: string, options: {
        reusePort: {
            type: string;
            reusePort?: boolean;
            debug?: boolean;
        };
    }, callback: (err: string, addr: {
        address: string;
        port: number;
    }) => void): void {
        let client: socket.MulticastSocket = this.findClient(cId, callback);
        if (client == null) {
            callback("udp client not exist", {
                address: addressStr,
                port: portNumber
            });
            return;
        }
        let bindAddr: socket.NetAddress = {
            address: addressStr,
            port: portNumber
        };
        client.bind(bindAddr, (err: BusinessError) => {
            if (err) {
                callback(err.message, {
                    address: addressStr,
                    port: portNumber
                });
                return;
            }
        });
        callback(null, {
            address: addressStr,
            port: portNumber
        });
    }

    createSocket(cId: number, options: {
        type: string;
    }): void {
        if (cId == null) {
            Logger.error('createSocket called with nil id parameter.');
            return;
        }
        let client: socket.MulticastSocket = this.findClient(cId, null);
        if (client != null) {
            Logger.error('createSocket called twice with the same id.');
            return;
        }
        const udp: socket.MulticastSocket = socket.constructMulticastSocketInstance();
        this.on(udp,cId);
        this.clientMap.set(cId, udp);
    }

    close(cId: number, callback: (errMsg: string) => void): number | null {
        let client: socket.MulticastSocket = this.findClient(cId, callback);
        if (client) {
            client.close((err: BusinessError) => {
                if (err) {
                    callback(err.message);
                    return;
                }
                this.clientMap.delete(cId);
                callback(null);
            });
        }
        return;
    }

    send(cId: number, msg: string, portNumber: number | null, addressStr: string | null, callback: (error?: string) => void): void {
        let client: socket.MulticastSocket = this.findClient(cId, callback);
        if (client) {
            let netAddress: socket.NetAddress = {
                address: addressStr,
                port: portNumber
            };
            let sendOptions: socket.UDPSendOptions = {
                data: msg,
                address: netAddress
            };
            client.send(sendOptions, (err: BusinessError) => {
                if (err) {
                    Logger.error('udp send fail');
                    callback(err.message);
                }
                else {
                    callback();
                }
            });
        }
        else {
            callback("updClient is null");
        }
    }

    setBroadcast(cId: number, flag: boolean, callback: (err: string | Object | null) => void): void {
        let client: socket.MulticastSocket = this.findClient(cId, callback);
        if (client) {
            let udpExtraOptions: socket.UDPExtraOptions = {
                broadcast: flag
            };
            client.setExtraOptions(udpExtraOptions, (err: BusinessError) => {
                if (err) {
                    Logger.error('setExtraOptions fail');
                    callback(err.message);
                    return;
                }
                Logger.info('setExtraOptions success');
            });
        }
    }

    addMembership(cId: number, multicastInterface: string): void {
        let client: socket.MulticastSocket = this.findClient(cId);
        if (client == null) {
            return;
        }
        let multicastAddressJson: {
            address: string;
            port: number;
        } = {
            address: multicastInterface,
            port: null
        }
        let netAddress: socket.NetAddress = multicastAddressJson;
        client.addMembership(netAddress, (err: Object) => {
            if (err) {
                Logger.error('add membership fail, err: ' + JSON.stringify(err));
                return;
            }
            Logger.info('add membership success');
        });
    }

    private on(client:socket.MulticastSocket,cId:number):void{
        let callback = (value: socket.SocketMessageInfo) => {
            let messageView = '';
            for (let i: number = 0; i < value.message.byteLength; i++) {
                let uint8Array = new Uint8Array(value.message);
                let messages = uint8Array[i];
                let message = String.fromCharCode(messages);
                messageView += message;
            }
            let payload = {
                data: JSON.stringify(messageView),
                address: value.remoteInfo.address,
                port: value.remoteInfo.port
            };
            this.ctx.rnInstance.emitDeviceEvent(`udp-${cId}-data`, payload);
        };
        client.on('message', callback);
    }

    dropMembership(cId: number, multicastInterface: string): void {
        let client: socket.MulticastSocket = <socket.MulticastSocket>this.findClient(cId);
        if (client == null) {
            return;
        }
        let netAddress: {
            address: string;
            port: number;
        } = {
            address: multicastInterface,
            port: null
        }
        client.dropMembership(netAddress, (err: Object) => {
            if (err) {
                Logger.error('drop membership fail, err: ' + JSON.stringify(err));
                return;
            }
            Logger.info('drop membership success');
        });
    }

    private findClient(cId: number, callback?: (err: unknown, addr?: {
        address: unknown;
        port: unknown;
    }) => void): socket.MulticastSocket {
        let client: socket.MulticastSocket = this.clientMap.get(cId);
        if (client == null) {
            if (callback) {
                const errorMessage = "UdpError there is no upd ";
                callback(errorMessage);
            }
        }
        return client;
    }

    public __onDestroy__() {
        this.clientMap.clear();
    }
}
