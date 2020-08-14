import { Logger } from 'tslog';
import ZWave, {
    ControllerState, ControllerError
} from 'openzwave-shared';
import { BehaviorSubject } from 'rxjs';
import { textSpanIsEmpty } from 'typescript';


const logger: Logger = new Logger({name: 'controller'});


export enum ControllerCommandEnum {
    None                        = 0,
    AddDevice                   = 1,
    CreateNewPrimary            = 2,
    ReceiveConfiguration        = 3,
    RemoveDevice                = 4,
    RemoveFailedNode            = 5,
    HasNodeFailed               = 6,
    ReplaceFailedNode           = 7,
    TransferPrimaryRole         = 8,
    RequestNetworkUpdate        = 9,
    RequestNodeNeighborUpdate   = 10,
    AssignReturnRoute           = 11,
    DeleteAllReturnRoutes       = 12,
    SendNodeInformation         = 13,
    ReplicationSend             = 14,
    CreateButton                = 15,
    DeleteButton                = 16
}


export interface ControllerStateItem {

    is_driver_connected: boolean,
    is_driver_ready: boolean,
    is_driver_failed: boolean,
    is_scan_complete: boolean,
}

export class ControllerService {

    private static instance: ControllerService;

    static getInstance() {
        if (!ControllerService.instance) {
            ControllerService.instance = new ControllerService();
        }
        return ControllerService.instance;
    }

    driverState: ControllerStateItem = this._resetState();

    driverStateObserver: BehaviorSubject<ControllerStateItem> =
        new BehaviorSubject<ControllerStateItem>(this.driverState);

    zwave: ZWave = undefined;

    constructor() {
        this._resetState();
    }
    
    init(zwave: ZWave) {

        zwave.on("connected", this._handleConnected.bind(this));
        zwave.on("driver ready", this._handleDriverReady.bind(this));
        zwave.on("driver failed", this._handleDriverFailed.bind(this));
        zwave.on("manufacturer specific DB ready",
            this._handleDBReady.bind(this));
        zwave.on("controller command", this._handleCommand.bind(this));
        zwave.on("scan complete", this._handleScanComplete.bind(this));

        this.zwave = zwave;
    }

    private _resetState(): ControllerStateItem {
        this.driverState = {
            is_driver_connected: false,
            is_driver_ready: false,
            is_driver_failed: false,
            is_scan_complete: false
        };
        return this.driverState;
    }

    private _handleConnected(version: string) {
        logger.info(`[driver: connected] version: ${version}`);
        this.driverState.is_driver_connected = true;
        this._updateStateObserver();
    }

    private _handleDriverReady(homeId: number) {
        logger.info(`[driver: ready] home id: ${homeId}`);
        this.driverState.is_driver_ready = true;
        this._updateStateObserver();
    }

    private _handleDriverFailed() {
        logger.info("[driver: failed] ¯\_(ツ)_/¯");
        this.driverState.is_driver_failed = true;
        this.driverState.is_driver_ready = false;
        this._updateStateObserver();
    }

    private _handleDBReady() {
        logger.info("[ctrl] manufacturer db ready");
    }

    private _handleCommand(
            nodeId: number, state: ControllerState,
            notif: ControllerError,
            message: string,
            command: number) {
        let d = {
            id: nodeId,
            state: state,
            notification: notif,
            message: message,
            command: command
        };
        logger.info("[ctrl: cmd]:", d);
    }

    private _handleScanComplete() {
        logger.info("[ctrl] scan complete");
        this.driverState.is_scan_complete = true;
        this._updateStateObserver();
    }

    private _updateStateObserver() {
        this.driverStateObserver.next(this.getState());
    }

    isScanComplete(): boolean {
        return this.driverState.is_scan_complete;
    }

    isStarted(): boolean {
        return this.driverState.is_driver_connected;
    }

    getStateObserver(): BehaviorSubject<ControllerStateItem> {
        return this.driverStateObserver;
    }

    getState(): ControllerStateItem {
        return this.driverState;
    }

    start(): void {
        if (!this.driverState.is_driver_connected) {
            this.zwave.connect('/dev/ttyACM0');
        }
    }

    stop(): void {
        if (!this.driverState.is_driver_connected) {
            return;
        }
        this.zwave.disconnect('/dev/ttyACM0');
        this._resetState();
    }
}