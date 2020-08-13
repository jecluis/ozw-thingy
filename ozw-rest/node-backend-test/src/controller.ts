import { Logger } from 'tslog';
import ZWave, {
    ControllerState, ControllerError
} from 'openzwave-shared';


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


export class Controller {

    scan_complete: boolean = false;

    constructor(private zwave: ZWave) {

        zwave.on("connected", this._handleConnected.bind(this));
        zwave.on("driver ready", this._handleDriverReady.bind(this));
        zwave.on("driver failed", this._handleDriverFailed.bind(this));
        zwave.on("manufacturer specific DB ready",
            this._handleDBReady.bind(this));
        zwave.on("controller command", this._handleCommand.bind(this));
        zwave.on("scan complete", this._handleScanComplete.bind(this));
    }

    private _handleConnected(version: string) {
        logger.info(`[driver: connected] version: ${version}`);
    }

    private _handleDriverReady(homeId: number) {
        logger.info(`[driver: ready] home id: ${homeId}`);
    }

    private _handleDriverFailed() {
        logger.info("[driver: failed] ¯\_(ツ)_/¯");
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
        this.scan_complete = true;
    }
}