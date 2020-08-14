import express, {
    Response as ExResponse, Request as ExRequest
} from 'express';
import ZWave from 'openzwave-shared';
import { ControllerService } from './ControllerService';
import { NetworkService } from './NetworkService';
import fs from 'fs';
import bodyParser from 'body-parser';
import { RegisterRoutes } from './tsoa/routes';
import swaggerUi from 'swagger-ui-express';
import cors from 'cors';


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

app.use(cors());

app.use(
    bodyParser.urlencoded({
        extended: true,
    })
);
app.use(bodyParser.json());
app.use("/docs", swaggerUi.serve, async (_req: ExRequest, res: ExResponse) => {
    return res.send(
        swaggerUi.generateHTML(await import("./tsoa/swagger.json"))
    );
});

RegisterRoutes(app);

const port = 31337;

const zwave = new ZWave({
    ConsoleOutput: false,
    ConfigPath: './zwave.db/',
    LogFileName: './ozw.log',
    Logging: true,
    // NotifyTransactions: true,

});

zwave.on("node event", (nodeId, data) => {
    console.log(`[node: event] id: ${nodeId}, data:`, data);
});

zwave.on("notification", (nodeId, notif, help) => {
    console.log(`[notification] id: ${nodeId}, help: ${help}, notif: `,
        notif);
});

let controller: ControllerService = ControllerService.getInstance();
controller.init(zwave);

let network_controller: NetworkService = NetworkService.getInstance();

//zwave.connect('/dev/ttyACM0');


/*
app.get('/', (req, res) => {
    res.send('Foo Bar Baz ASDADASDASD');
});


app.get('/network/state', (req, res) => {
    res.send(network_controller.getState());
});

app.get('/controller/state', (req, res) => {
    res.send(controller.getState());
});

app.get('/network/status', (req, res) => {

    res.send({
        'server': {

        }
    })

});
*/

app.listen(config.server_port, config.server_host, err => {
    if (err) {
        return console.error(err);
    }
    return console.log('server is listening on', port);
});


// stuff we haven't figured out yet where to leave, or when to drop.
//
/*
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
*/

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