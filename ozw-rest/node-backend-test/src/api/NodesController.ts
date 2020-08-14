import {
    Body,
    Controller,
    Get,
    Path,
    Post,
    Query,
    Route,
    SuccessResponse,
} from 'tsoa';
import { NetworkService } from '../NetworkService';
import { NodeItem } from '../types/nodes';
import { ValueItem } from '../types/values';


@Route("/api/nodes")
export class NodesController extends Controller {

    network: NetworkService;

    constructor() {
        super();
        this.network = NetworkService.getInstance();
    }

    @Get()
    public async getNodes(): Promise<NodeItem[]> {
        return this.network.getNodes();
    }

    @Get("{nodeId}")
    public async getNode(
        @Path() nodeId: number
    ): Promise<NodeItem> {
        return this.network.getNode(nodeId);
    }

    @Get("{nodeId}/values")
    public async getNodeValues(
        @Path() nodeId: number
    ): Promise<ValueItem[]> {
        return this.network.getValues(nodeId);
    }

    @Get("{nodeId}/scope/{scope}")
    public async getNodeValuesByScope(
        @Path() nodeId: number,
        @Path() scope: string
    ): Promise<ValueItem[]> {
        let scope_str = scope.toLowerCase();
        if (scope_str !== "basic" && scope_str !== "user" &&
            scope_str !== "system" && scope_str !== "config" &&
            scope_str !== "count") {
            return []; // we should be returning error here.
        }

        let node_values = this.network.getValues(nodeId);
        let scope_values = [];
        node_values.forEach( (value) => {
            if (value.genre.toLowerCase() === scope_str) {
                scope_values.push(value);
            }
        });
        
        return scope_values;
    }
}