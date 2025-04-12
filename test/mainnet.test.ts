import { describe, test, afterAll, beforeAll, expect } from "bun:test";
import { Foundry, type DeployedContract } from "@adraffy/blocksmith";
import { namehash } from "ethers";

describe("AliasResolver", () => {
	let foundry!: Foundry;
	let aliasResolver!: DeployedContract;
	const aliasName = "chonk.chonk";
	beforeAll(async () => {
		foundry = await Foundry.launch({
			fork: "https://eth.drpc.org",
			infoLog: false,
		});
		afterAll(foundry.shutdown);
		aliasResolver = await foundry.deploy({
			file: "AliasResolver",
			args: [
				"0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
				"0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401",
				"0x50Eb7A57C17e0E97EaC1B366b1Ea673Ec2BbDa61",
			],
		});
		await foundry.overrideENS({
			name: aliasName,
			owner: foundry.wallets.admin.address,
			resolver: aliasResolver,
		});
	});

	for (const name of ["raffy.eth", ""]) {
		test(`set alias: ${name || "<empty>"}`, async () => {
			await foundry.confirm(
				aliasResolver.setText(namehash(aliasName), "alias", name)
			);
			expect(
				aliasResolver.aliases(namehash(aliasName)),
				"alias"
			).resolves.toStrictEqual(name);
		});
	}

	for (const name of [
		"raffy.eth",
		"raffy.base.eth",
		"raffy.linea.eth",
		"raffy.teamnick.eth",
	]) {
		test(`resolve: ${name}`, async () => {
			await foundry.confirm(
				aliasResolver.setText(namehash(aliasName), "alias", name)
			);
			const resolver = await foundry.provider.getResolver(aliasName);
			expect(resolver?.address, "resolver").toStrictEqual(
				aliasResolver.target
			);
			expect(resolver!.getAddress(), "address").resolves.toStrictEqual(
				"0x51050ec063d393217B436747617aD1C2285Aeeee"
			);
		});
	}
});
