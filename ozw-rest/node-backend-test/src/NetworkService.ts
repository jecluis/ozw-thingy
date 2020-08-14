import { NodesService, NodeValueDatasource } from './NodesService';
import ZWave, { Value } from 'openzwave-shared';
import { ControllerService, ControllerStateItem } from './ControllerService';
import { Observable, BehaviorSubject } from 'rxjs';
import { Logger } from 'tslog';
import { NodeItem } from './types/nodes';
import { isInterfaceDeclaration } from 'typescript';


const logger: Logger = new Logger({name: 'network'});


// there are a couple of items we don't change, simply because we don't have
// that sort of information readily available. We'll need to figure it out
// somehow...
export interface NetworkStateItem {
    is_stopped: boolean;
    is_started: boolean;
    is_failed: boolean;
    is_resetted: boolean;   // currently not changed
    is_ready: boolean;
    is_awake: boolean;      // currently not changed
}


export class NetworkService {

    private static instance: NetworkService;

    static getInstance() {
        if (!NetworkService.instance) {
            NetworkService.instance = new NetworkService();
        }
        return NetworkService.instance;
    }

    driver: ControllerService;
    zwave: ZWave;
    nodesService: NodesService;
    valueDataSource: NodeValueDatasource;

    networkState: NetworkStateItem;


    private constructor()
    {
        this.driver = ControllerService.getInstance();
        this.zwave = this.driver.zwave;
        this._resetState();

        this.driver.getStateObserver()
            .subscribe( (state) => {
                this._updateNetworkDriverState(state);
        });
    }

    private _resetState(): void {
        if (this.nodesService) {
            delete this.nodesService;
        }
        if (this.valueDataSource) {
            delete this.valueDataSource;
        }

        this.networkState  = {
            is_stopped: true,
            is_resetted: false,
            is_started: false,
            is_ready: false,
            is_awake: false,
            is_failed: false,
        }

        this.nodesService = new NodesService(this.driver.zwave);
        this.valueDataSource = new NodeValueDatasource(this.driver.zwave);
    }


    private _updateNetworkDriverState(state: ControllerStateItem) {
        console.log(">> driver state: ", state);
        this.networkState.is_stopped = true;
        this.networkState.is_started = false;
        this.networkState.is_failed = false;
        this.networkState.is_started = false;

        if (state.is_driver_ready && !state.is_scan_complete) {
            this.networkState.is_started = true;
            this.networkState.is_stopped = false;
        } else if (state.is_driver_failed) {
            this.networkState.is_failed = true;
            this.networkState.is_stopped = true;
        }
        
        if (state.is_scan_complete) {
            this.networkState.is_ready = true;
            this.networkState.is_stopped = false;
            this.networkState.is_started = true;
            this._onNetworkStarted();
        }
        logger.info("updated network state: ", this.networkState);
    }

    private _onNetworkStarted() {
        let nodes = this.getNodes();
        nodes.forEach( (node) => {
            this._checkEnablePolling(node);
        });
        this.zwave.setPollInterval(60000*nodes.length);
    }

    private _checkEnablePolling(node: NodeItem) {
        let values = this.getValues(node.id);
        values.forEach( (value) => {

            switch (value.class_id) {
                case 0x25: // COMMAND_CLASS_SWITCH_BINARY
                case 0x26: // COMMAND_CLASS_SWITCH_MULTILEVEL
                case 0x32: // COMMAND_CLASS_METER
                    this.zwave.enablePoll({
                        node_id: node.id,
                        class_id: value.class_id,
                        instance: value.instance,
                        index: value.index
                    }, 60000);
                    break;
            }

        });
    }

    getState(): NetworkStateItem {
        return this.networkState;
    }

    getNodes(): NodeItem[] {
        return Object.values(this.nodesService.nodes);
    }

    getNode(nodeId: number): NodeItem {
        if (nodeId in this.nodesService.nodes) {
            return this.nodesService.nodes[nodeId];
        }
        return undefined;
    }

    getValues(nodeId: number): Value[] {
        return this.valueDataSource.getValues(nodeId);
    }

    refreshNodeInfo(nodeId?: number): void {
        if (nodeId) {
            logger.info(`refresh node id ${nodeId}`);
        } else {
            logger.info("refreshing all nodes");
        }
        this.nodesService.refreshNodeInfo(nodeId);
    }

    networkStart(): void {
        if (!this.driver.isStarted()) {
            this.driver.start();
        }
    }

    networkStop(): void {
        if (!this.driver.isStarted()) {
            return;
        }
        this.driver.stop();
        this._resetState();        
    }

}