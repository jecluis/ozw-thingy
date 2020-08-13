import express from 'express';
import ZWave from 'openzwave-shared';
import { NodeInfo, Value, ControllerState,
         ControllerError, Notification
 } from 'openzwave-shared';
import { NodesController, NodeValueDatasource } from './nodes';
import { Controller } from './controller';
import fs from 'fs';


interface BackendConfig {
    server_host: string,
    server_port: number,
    zwave_device: string,
}

let config: BackendConfig = {
    server_port: 31337,
    server_host: "0.0.0.0",
    zwave_device: "/dev/ttyACM0",
};

if (fs.existsSync('./config.json')) {
    let raw: string = fs.readFileSync('./config.json', 'utf-8');
    let loaded_config: {} = JSON.parse(raw);
    console.log("loaded config:", config);
    config = {...config, ...loaded_config};
}

console.log("config: ", config);

const app = express();
const port = 31337;

const zwave = new ZWave({
    ConsoleOutput: false,
    ConfigPath: './zwave.db/',
    LogFileName: './ozw.log',
    Logging: true,
    NotifyTransactions: true,
});


let node_controller: NodesController = new NodesController(zwave);
let node_datasource: NodeValueDatasource = new NodeValueDatasource(zwave);
let controller: Controller = new Controller(zwave);


zwave.connect('/dev/ttyACM0');



function refreshNodeInfo() {
    if (!controller.isScanComplete()) {
        return false;
    }
    let nodes = Object.values(node_controller.nodes);
    nodes.forEach((node) => {
        console.log(`[refresh node] id: ${node.id}`);
        zwave.refreshNodeInfo(node.id);
    });
    return true;
}


app.get('/', (req, res) => {
    res.send('Foo Bar Baz');
});

app.get('/nodes', (req, res) => {
    res.send(Object.values(node_controller.nodes));
});

app.get('/nodes/refresh', (req, res) => {
    let ret = refreshNodeInfo();
    res.send(ret);
});

app.get('/nodes/:nodeId', (req, res) => {
    let id = req.params.nodeId;
    if (!(id in node_controller.nodes)) {
        res.send({});
    }
    res.send(node_controller.nodes[id]);
});

app.get('/nodes/:nodeId/values', (req, res) => {
    let id = req.params.nodeId;
    if (!(id in node_controller.nodes)) {
        res.send([]);
    }
    let values = node_datasource.getValues(+id);
    res.send(values);
});

app.listen(config.server_port, config.server_host, err => {
    if (err) {
        return console.error(err);
    }
    return console.log('server is listening on', port);
});


// stuff we haven't figured out yet where to leave, or when to drop.
//
zwave.on("notification", (nodeId, message) => {
    console.log(`[node ${nodeId}] message: ${Notification[message]}`);
});

zwave.on("user alert", (notification, help_str) => {
    console.log("notification = ", notification, "help = ", help_str);
});

zwave.on("scan complete", () => {
    console.log("scan complete");

    for (let node in node_controller.nodes) {
        let node_item = node_controller.nodes[node];
        let node_id = node_item.id;
        let info = node_item.info;
        let num_values = node_datasource.getValues(node_id).length
        console.log(
`------------------------------------\n`,
`         NODE ${node_id} \n`,
`     ${info.product}\n`,
` -----------------------------------\n`,
` is_listening: ${zwave.isNodeListeningDevice(node_id)}\n`,
` is_beaming:   ${zwave.isNodeBeamingDevice(node_id)}\n`,
` is_routing:   ${zwave.isNodeRoutingDevice(node_id)}\n`,
` is_ready:     ${node_item.ready}\n`,
` num values:   ${num_values}\n`,
`------------------------------------\n\n`);
    }
});

zwave.on("node event", (nodeId, data) => {
    console.log(`[node ${nodeId}] data = `, data);
});


//
// still here just in case we need it.
//
/*
async function mainLoop() {
    while (true) {
        console.log("number of nodes: ", Object.keys(nodes).length)
        console.log("------ NODES -------");
        for (let node in nodes) {
            console.log(" + node ", node);
            nodes[node].values.forEach(value => {
                console.log(
                    " '- value_id: ", value.value_id, ", label: ", value.label);
            });
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}
*/
//mainLoop();