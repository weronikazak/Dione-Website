function generateUID() {
	var firstPart = (Math.random() * 46656) | 0;
	var secondPart = (Math.random() * 46656) | 0;
	firstPart = parseInt(("000" + firstPart.toString(36)).slice(-3));
	secondPart = parseInt(("000" + secondPart.toString(36)).slice(-3));
	return firstPart.toString() + secondPart.toString();
}

module.exports = generateUID;