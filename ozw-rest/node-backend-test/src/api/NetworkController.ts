import {
    Body,
    Controller,
    Get,
    Path,
    Post,
    Query,
    Route,
    SuccessResponse,
    Put,
} from 'tsoa';
import { NetworkService, NetworkStateItem } from '../NetworkService';
import { ControllerService, ControllerStateItem } from '../ControllerService';

interface NetworkStatus {
    driver: ControllerStateItem;
    network: NetworkStateItem;
}

@Route('/api/network')
export class NetworkController extends Controller {

    network_service: NetworkService;
    driver_service: ControllerService;

    constructor() {
        super();
        this.network_service = NetworkService.getInstance();
        this.driver_service = ControllerService.getInstance();
    }

    @Get("/status")
    public async getNodes(): Promise<NetworkStatus> {
        return {
            driver: this.driver_service.getState(),
            network: this.network_service.getState()
        };
    }

    @Put("/start")
    public async startNetwork(): Promise<boolean> {
        this.network_service.networkStart();
        return true;
    }

    @Put("/stop")
    public async stopNetwork(): Promise<boolean> {
        this.network_service.networkStop();
        return true;
    }

}