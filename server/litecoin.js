const reverse = require('buffer-reverse');
const zmq = require('zeromq/v5-compat');
const { address: Address, networks, Block, Transaction } = require('litecoinjs-lib');
const network = networks.litereg;

const { LITECOIN_BLOCK, LITECOIN_TX } = process.env;

const zmqRawBlock = zmq.socket('sub');
zmqRawBlock.connect(LITECOIN_BLOCK);
zmqRawBlock.subscribe('rawblock');

const zmqRawTx = zmq.socket('sub');
zmqRawTx.connect(LITECOIN_TX);
zmqRawTx.subscribe('rawtx');

zmqRawTx.on('message', async (topic, message, sequence) => {
	try {
		let hex = message.toString('hex');

		let tx = Transaction.fromHex(hex);
		for (let i = 0; i < tx.outs.length; i++) {
			let { script, value } = tx.outs[i];
			if (!script) continue;

			let address;
			try {
				address = Address.fromOutputScript(script, network);
			} catch (e) {
				return;
			}

			if (invoices[address]) {
				boom({ amount: value, confirmed: 0, hash: tx.getId(), text: address });
			}
		}
	} catch (e) {
		console.log(e);
	}
});

zmqRawBlock.on('message', async (topic, message, sequence) => {
	let block = Block.fromHex(message.toString('hex'));
	block.transactions.map((tx) => {
		let hash = reverse(tx.getHash()).toString('hex');
		let invoice = Object.values(invoices).find((i) => i.hash === hash);
		if (invoice) {
			boom({ amount: invoice.amount, confirmed: 1, hash, text: address });
		}
	});
});
