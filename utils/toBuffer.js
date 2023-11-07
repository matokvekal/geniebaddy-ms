// const { Blob } = require('buffer');

const toBuffer = (b64Data, encoding) => {
	const buffer = Buffer.from(b64Data, encoding);
	// const blob = new Blob([new Uint8Array(buffer)]);
	return buffer;
};

module.exports = { toBuffer };
