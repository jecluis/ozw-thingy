import ZWave from 'openzwave-shared';
import { Value, ValueId, NodeInfo, Notification } from 'openzwave-shared';
import { Logger } from 'tslog';
import { BehaviorSubject } from 'rxjs';



const nctrlog = new Logger({name: 'nodes-ctrl'});
const vdatalog = new Logger({name: 'values-data'});


export class NodeValueDatasource {

    node_values: {[id: number]: {[id: string]: Value}} = {}

    constructor(private zwave: ZWave) {

        zwave.on("value added", (nodeId, comClass, value) =>
            this._handleValueAdded(nodeId, comClass, value));
        zwave.on("value changed", (nodeId, comClass, value) =>
            this._handleValueChanged(nodeId, comClass, value));
        zwave.on("value refreshed", (nodeId, comClass, value) =>
            this._handleValueRefreshed(nodeId, comClass, value));
        zwave.on("value removed", (nodeId, comClass, inst, idx) =>
            this._handleValueRemoved(nodeId, comClass, inst, idx));
        zwave.on("node removed", (nodeId) => this._handleNodeRemoved(nodeId));
    }


    private _handleValueAdded(nodeId: number, comClass: number, value: Value) {
        vdatalog.info(`[value: added] id: ${nodeId}, value: ${value.value_id}`);

        if (!(nodeId in this.node_values)) {
            this.node_values[nodeId] = {};
        }
        this.node_values[nodeId][value.value_id] = value;
    }

    private _handleValueChanged(
            nodeId: number, comClass: number, value: Value) {
        vdatalog.info(`[value: changed] id: ${nodeId}, `+
                      `value: ${value.value_id}`);
        this.node_values[nodeId][value.value_id] = value;
    }

    private _handleValueRefreshed(
            nodeId: number, comClass: number, value: Value) {
        vdatalog.info(`[value: refresh] id: ${nodeId}, `+
                      `value: ${value.value_id}`);
        this.node_values[nodeId][value.value_id] = value;
    }

    private _handleValueRemoved(
            nodeId: number, cls: number, inst: number, idx: number) {
        vdatalog.info(`[value: rem'd] id: ${nodeId}, value: `+
                      `${cls}-${inst}-${idx}`);
        if (!(nodeId in this.node_values)) {
            return; // node does not exist, move on.
        }
        let value_id: string = `${nodeId}-${cls}-${inst}-${idx}`;
        if (!(value_id in this.node_values[nodeId])) {
            return; // value does not exist, move on.
        }
        delete this.node_values[nodeId][value_id];
    }

    private _handleNodeRemoved(nodeId: number) {
        vdatalog.info(`[value: remove node] id: ${nodeId}`);
        if (nodeId in this.node_values) {
            delete this.node_values[nodeId];
        }
    }

    getValues(nodeId: number): Value[] {
        if (!(nodeId in this.node_values)) {
            return [];
        }
        let values = this.node_values[nodeId];
        let value_lst = Object.values(values);
        return value_lst;
    }
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

export interface NodeItem {
    id: number;
    info: NodeInfo;
    state: NodeItemState;
    ready: boolean;
    caps: NodeItemCaps;
}

export class NodesController {

    nodes: {[id: number]: NodeItem} = {};
    stateObserver: BehaviorSubject<NodeItemState> =
        new BehaviorSubject<NodeItemState>(undefined);


    constructor(private zwave: ZWave) {
        this.zwave.on("node added", this._handleNodeAdded.bind(this));
        this.zwave.on("node removed", this._handleNodeRemoved.bind(this));
        this.zwave.on("node reset", this._handleNodeReset.bind(this));
        this.zwave.on("node ready", this._handleNodeReady.bind(this));
        this.zwave.on("node naming", this._handleNodeNaming.bind(this));
        this.zwave.on("node available", this._handleNodeAvailable.bind(this));
        this.zwave.on("notification", this._handleNotification.bind(this));
    }

    private _handleNodeAdded(nodeId: number) {
        nctrlog.info(`[node: added] id: ${nodeId}`);
        nctrlog.info(`[node: added] nodes: `, this.nodes);
        this.nodes[nodeId] = {
            id: nodeId,
            info: undefined,
            state: undefined,
            ready: false,
            caps: {
                is_listening: false,
                is_routing: false,
                is_beaming: false,
                is_controller: false,
                is_primary_controller: false
            }
        };
    }

    private _handleNodeRemoved(nodeId: number) {
        nctrlog.info(`[node: rem'd] id: ${nodeId}`);
        if (nodeId in this.nodes) {
            delete this.nodes[nodeId];
        }
    }

    private _handleNodeReset(nodeId: number) {
        nctrlog.info(`[node: reset] id: ${nodeId} ¯\_(ツ)_/¯`);
    }

    private _handleNodeReady(nodeId: number, nodeInfo: NodeInfo) {
        nctrlog.info(`[node: ready] id: ${nodeId}, info: ${nodeInfo.product}`);
        if (!(nodeId in this.nodes)) {
            return;
        }
        this.nodes[nodeId].ready = true;

        let is_controller = (this.zwave.getControllerNodeId() === nodeId);
        let is_primary = false;
        if (is_controller) {
            is_primary = this.zwave.isPrimaryController();
        }
        let caps: NodeItemCaps = {
            is_listening: this.zwave.isNodeListeningDevice(nodeId),
            is_beaming: this.zwave.isNodeBeamingDevice(nodeId),
            is_routing: this.zwave.isNodeRoutingDevice(nodeId),
            is_controller: is_controller,
            is_primary_controller: is_primary
        }
        this.nodes[nodeId].caps = caps;
    }

    private _handleNodeNaming(nodeId: number, nodeInfo: NodeInfo) {
        nctrlog.info(`[node: naming] id: ${nodeId}, info: ${nodeInfo.product}`);
        if (nodeId in this.nodes) {
            this.nodes[nodeId].info = nodeInfo;
        }
    }

    private _handleNodeAvailable(nodeId: number, nodeInfo: NodeInfo) {
        nctrlog.info(`[node: available] id: ${nodeId}`);
    }

    private _handleNotification(nodeId: number, notif: Notification) {
        nctrlog.info(`[node: notification] id: ${nodeId}, `+
                     `notification: ${Notification[notif]}`);
        let node_state: NodeItemState = undefined;

        switch (notif) {
            case Notification.NodeAlive:
                node_state = NodeItemState.NodeAlive;
                break;
            case Notification.NodeAwake:
                node_state = NodeItemState.NodeAwake;
                break;
            case Notification.NodeDead:
                node_state = NodeItemState.NodeDead;
                break;
            case Notification.NodeSleep:
                node_state = NodeItemState.NodeSleep;
                break;
        }
        if (nodeId in this.nodes) {
            this.nodes[nodeId].state = node_state;
            this.updateState();
        }
    }

    private updateState() {
        let current_state = NodeItemState.NodeDead;
        Object.values(this.nodes).forEach( (node) => {
            if (node.id == this.zwave.getControllerNodeId()) {
                return; // skip controller.
            }
            if (current_state == node.state) {
                return;
            } else if (!current_state) {
                current_state = node.state;
            } else if (node.state == NodeItemState.NodeDead) {
                return; // we have something else that is not dead.
            } else if (node.state == NodeItemState.NodeAlive) {
                // we got a live one. network is alive.
                current_state = NodeItemState.NodeAlive;
            } else {
                current_state = node.state;
            }
        });
        nctrlog.info("updating node state to "+current_state.toString());
        this.stateObserver.next(current_state);
    }

    getStateObservable(): BehaviorSubject<NodeItemState> {
        return this.stateObserver;
    }

    refreshNodeInfo(nodeId?: number): void {
        if (nodeId) {
            if (!(nodeId in this.nodes)) {
                nctrlog.error(`unknown node id ${nodeId}`);
                return;
            }
            nctrlog.info(`refreshing info for node ${nodeId}`);
            this.zwave.refreshNodeInfo(nodeId);
        }

        nctrlog.info("refreshing information for all nodes");
        Object.values(this.nodes).forEach( (node) => {
            nctrlog.info(`refreshing info for node ${node.id}`);
            this.zwave.refreshNodeInfo(node.id);
        });
    }
}