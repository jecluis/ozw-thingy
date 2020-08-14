export interface NodeInfoItem {
    manufacturer: string;
    manufacturerid: string;
    product: string;
    producttype: string;
    productid: string;
    type: string;
    name: string;
    loc: string;
}


export enum NodeItemState {
    Nop = 2,
    NodeAwake = 3,
    NodeSleep = 4,
    NodeDead = 5,
    NodeAlive = 6
}


export interface NodeItemCaps {
    is_listening: boolean;
    is_routing: boolean;
    is_beaming: boolean;
    is_controller: boolean;
    is_primary_controller: boolean;
}


export interface NodeClass {
    is_meter: boolean;
    is_switch: boolean;
}


export interface NodeItem {
    id: number;
    info: NodeInfoItem;
    state: NodeItemState;
    ready: boolean;
    caps: NodeItemCaps;
    class: NodeClass;
    last_seen?: string;
}
