// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {ENS} from "@ensdomains/ens-contracts/contracts/registry/ENS.sol";
import {IExtendedResolver} from "@ensdomains/ens-contracts/contracts/resolvers/profiles/IExtendedResolver.sol";
import {IUniversalResolver} from "@ensdomains/ens-contracts/contracts/universalResolver/IUniversalResolver.sol";
import {ITextResolver} from "@ensdomains/ens-contracts/contracts/resolvers/profiles/ITextResolver.sol";
import {IMulticallable} from "@ensdomains/ens-contracts/contracts/resolvers/IMulticallable.sol";
import {INameWrapper} from "@ensdomains/ens-contracts/contracts/wrapper/INameWrapper.sol";
import {CCIPReader} from "@ensdomains/ens-contracts/contracts/ccipRead/CCIPReader.sol";
import {NameCoder} from "@ensdomains/ens-contracts/contracts/utils/NameCoder.sol";

contract AliasResolver is IExtendedResolver, CCIPReader, ERC165 {
    ENS public immutable registry;
    INameWrapper public immutable nameWrapper;
    IUniversalResolver public immutable universalResolver;
    mapping(bytes32 node => string name) public aliases;

    constructor(
        ENS _registry,
        INameWrapper _nameWrapper,
        IUniversalResolver _universalResolver
    ) {
        registry = _registry;
        nameWrapper = _nameWrapper;
        universalResolver = _universalResolver;
    }

    /// @inheritdoc ERC165
    function supportsInterface(
        bytes4 interfaceID
    ) public view virtual override(ERC165) returns (bool) {
        return
            type(IExtendedResolver).interfaceId == interfaceID ||
            super.supportsInterface(interfaceID);
    }

    /// @dev Return true if `node` can be modified by `op`.
    function _canModifyName(
        bytes32 node,
        address op
    ) internal view returns (bool) {
        address owner = registry.owner(node);
        return
            owner == address(nameWrapper)
                ? nameWrapper.canModifyName(node, op)
                : (owner == op || registry.isApprovedForAll(owner, op));
    }

    /// @dev Return true if `key` is "alias".
    function _isAliasKey(string memory key) internal pure returns (bool) {
        return keccak256(bytes(key)) == keccak256("alias");
    }

    function setText(
        bytes32 node,
        string memory key,
        string memory value
    ) external {
        require(_isAliasKey(key), "only alias");
        require(_canModifyName(node, msg.sender), "not authorized");
        aliases[node] = value;
        emit ITextResolver.TextChanged(node, key, key, value);
    }

    /// @dev This function executes over multiple steps (step 1 of 2).
    function resolve(
        bytes memory name,
        bytes calldata data
    ) external view returns (bytes memory result) {
        bytes32 node = NameCoder.namehash(name, 0);
        if (bytes4(data) == ITextResolver.text.selector) {
            (, string memory key) = abi.decode(data[4:], (bytes32, string));
            if (_isAliasKey(key)) {
                return abi.encode(aliases[node]);
            }
        }
        name = NameCoder.encode(aliases[node]);
        node = NameCoder.namehash(name, 0);
        require(node != bytes32(0), "no alias");
        bytes memory replaced;
        if (bytes4(data) == IMulticallable.multicall.selector) {
            bytes[] memory calls = abi.decode(data[4:], (bytes[]));
            for (uint256 i; i < calls.length; i++) {
                calls[i] = _replaceNode(calls[i], node);
            }
            replaced = abi.encode(calls);
        } else {
            replaced = _replaceNode(data, node);
        }
        ccipRead(
            address(universalResolver),
            abi.encodeCall(IUniversalResolver.resolve, (name, replaced)),
            this.resolveCallback.selector,
            ""
        );
    }

    /// @dev CCIP-Read callback from `resolve()` (step 2 of 2).
    /// @param response The response data from `UniversalResolver`.
    /// @return result The abi-encoded response from `UniversalResolver`.
    function resolveCallback(
        bytes calldata response,
        bytes calldata
    ) external pure returns (bytes memory result) {
        (result, ) = abi.decode(response, (bytes, address));
    }

    /// @dev Replace the node in the resolver profile calldata with a different node.
    /// @param data The calldata to modify.
    /// @param node The new node.
    /// @return replaced The new calldata.
    function _replaceNode(
        bytes memory data,
        bytes32 node
    ) internal pure returns (bytes memory replaced) {
        replaced = abi.encodePacked(data);
        assembly {
            mstore(add(replaced, 36), node)
        }
    }
}
