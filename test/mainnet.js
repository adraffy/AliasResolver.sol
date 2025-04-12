import { test, after } from "node:test";
import assert from "node:assert/strict";
import { Foundry } from "@adraffy/blocksmith";
import { namehash } from "ethers";

test("AliasResolver", async (T) => {
	const foundry = await Foundry.launch({
		fork: "https://eth.drpc.org",
		infoLog: false,
	});
	after(foundry.shutdown);

	const aliasResolver = await foundry.deploy({
		file: "AliasResolver",
		args: [
			"0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e", // ENSRegistry
			"0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401", // NameWrapper
			"0x50Eb7A57C17e0E97EaC1B366b1Ea673Ec2BbDa61", // UniversalResolver
		],
	});

	const aliasName = "chonk.chonk";
	await foundry.overrideENS({
		name: aliasName,
		owner: foundry.wallets.admin.address,
		resolver: aliasResolver,
	});

	await T.test("set alias", async (TT) => {
		for (const name of ["raffy.eth", ""]) {
			await TT.test(name || "<empty>", async () => {
				await foundry.confirm(
					aliasResolver.setText(namehash(aliasName), "alias", name)
				);
				assert.equal(
					await aliasResolver.aliases(namehash(aliasName)),
					name,
					"alias"
				);
			});
		}
		await TT.test("not authorized", async () => {
			await assert.rejects(
				() =>
					aliasResolver.setText(
						namehash("notmyname.eth"),
						"alias",
						""
					),
				(err) => {
					console.log(err.revert.args);
					assert.deepEqual(err.revert?.args, ["not authorized"]);
					return true;
				}
			);
		});
		await TT.test("not setText('alias')", async () => {
			await assert.rejects(
				() => aliasResolver.setText(namehash(aliasName), "chonk", ""),
				(err) => {
					assert.deepEqual(err.revert?.args, ["expected alias"]);
					return true;
				}
			);
		});
	});

	await T.test("resolve", async (TT) => {
		for (const name of [
			"raffy.eth",
			"raffy.base.eth",
			"raffy.linea.eth",
			"raffy.teamnick.eth",
		]) {
			await TT.test(name, async () => {
				await foundry.confirm(
					aliasResolver.setText(namehash(aliasName), "alias", name)
				);
				const resolver = await foundry.provider.getResolver(aliasName);
				assert.equal(
					resolver.address,
					aliasResolver.target,
					"resolver"
				);
				assert.equal(
					await resolver.getAddress(),
					"0x51050ec063d393217B436747617aD1C2285Aeeee",
					"address"
				);
			});
		}
	});
});
