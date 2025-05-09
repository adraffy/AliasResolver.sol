# AliasResolver.sol

* [`AliasResolver.sol`](./src/AliasResolver.sol)

### Instructions

1. `setResolver()` to `AliasResolver`
1. `setText("alias")` to the ENS name you want to alias (eg. `"raffy.eth"`)

### Deployments

* [`mainnet:0xD5e9Ae1dB3e1551fdaf57A130d6a723DD9cf8C2c`](https://etherscan.io/address/0xD5e9Ae1dB3e1551fdaf57A130d6a723DD9cf8C2c#code)

### Setup

1. `npm i`
1. `forge i`

### Test

* [`npm test`](./test//mainnet.js) &mdash; aliases a variety of complex `mainnet` resolvers

### Todo

* `sepolia` and `holesky` deployments
* support deep aliasing: `raffy.a.eth` &rarr; (`a.eth` &rarr; `b.eth`) &rarr; `raffy.b.eth`\
 h/t Don_Luvat