import { FoundryDeployer } from "@adraffy/blocksmith";
import { createInterface } from "node:readline/promises";

const rl = createInterface({
	input: process.stdin,
	output: process.stdout,
});

const deployer = await FoundryDeployer.load({
	provider: "https://eth.drpc.org",
	privateKey: await rl.question("Private Key (empty to simulate): "),
});

const deployable = await deployer.prepare({
	file: "AliasResolver",
	args: [
		"0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
		"0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401",
		"0x50Eb7A57C17e0E97EaC1B366b1Ea673Ec2BbDa61",
	],
});

if (deployer.privateKey || true) {
	await rl.question("Ready? (abort to stop) ");
	//await deployable.deploy();
	deployable.address = '0xD5e9Ae1dB3e1551fdaf57A130d6a723DD9cf8C2c';
	const apiKey = await rl.question("Etherscan API Key: ");
	if (apiKey) {
		await deployable.verifyEtherscan({ apiKey });
	}
}

rl.close();
