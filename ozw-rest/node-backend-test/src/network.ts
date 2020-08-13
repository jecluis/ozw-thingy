import { NodesController, NodeValueDatasource,
         NodeItemState, NodeItem } from './nodes';
import ZWave, { Value } from 'openzwave-shared';
import { Controller, ControllerStateItem } from './controller';
import { Observable, BehaviorSubject } from 'rxjs';
import { Logger } from 'tslog';


const logger: Logger = new Logger({name: 'network'});


export interface NetworkStateItem {
    is_starting: boolean;
    is_ready: boolean;
    is_awake: boolean;
    is_failed: boolean;
    is_sleeping: boolean;
}

class NetworkController {

    nodesController: NodesController;
    valueDataSource: NodeValueDatasource;

    updatedNodeState: BehaviorSubject<NodeItemState>;
    updatedDriverState: Observable<ControllerStateItem>;

    networkState: NetworkStateItem = {
        is_starting: false,
        is_ready: false,
        is_awake: false,
        is_failed: false,
        is_sleeping: false,
    }

    constructor(private zwave: ZWave, private driver: Controller) {
        this.nodesController = new NodesController(zwave);
        this.valueDataSource = new NodeValueDatasource(zwave);

        this.nodesController.getStateObservable()
            .subscribe( (state) => {
                this._updateNetworkNodeState(state);
        });
        this.driver.getStateObserver()
            .subscribe( (state) => {
                this._updateNetworkDriverState(state);
            });
    }

    private _updateNetworkNodeState(state: NodeItemState) {
        switch (state) {
            case NodeItemState.NodeDead:
                this.networkState.is_ready = false;
                this.networkState.is_awake = false;
                break;
            case NodeItemState.NodeAwake:
            case NodeItemState.NodeAlive:
                if (this.driver.isScanComplete() &&
                    state != NodeItemState.NodeAwake) {               
                    this.networkState.is_ready = true;
                    break;
                }
                this.networkState.is_ready = false;
                this.networkState.is_awake = true;
                break;
            case NodeItemState.NodeSleep:
                if (this.driver.isScanComplete()) {
                    this.networkState.is_sleeping = true;
                }
                break;
        }
        logger.info("updated network state: ", this.networkState);
    }

    private _updateNetworkDriverState(state: ControllerStateItem) {
        this.networkState.is_starting = false;
        this.networkState.is_failed = false;

        if (state.is_driver_ready && !state.is_scan_complete) {
            this.networkState.is_starting = true;
        } else if (state.is_driver_failed) {
            this.networkState.is_failed = true;
        }
        logger.info("updated network state: ", this.networkState);
    }

    getState(): NetworkStateItem {
        return this.networkState;
    }

    getNodes(): NodeItem[] {
        return Object.values(this.nodesController.nodes);
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
        this.nodesController.refreshNodeInfo(nodeId);
    }

}