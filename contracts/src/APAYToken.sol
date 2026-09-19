// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title APAYToken
 * @notice UUPS Upgradeable & EIP-3009 Compliant Utility Token for AgentPay AI on BotChain.
 *
 * Implements UUPS upgradeability (ERC1967Proxy), ERC-20, ERC-20 Burnable, and EIP-3009 (Transfer With Authorization)
 * enabling gasless, non-sequential parallel micropayments via EIP-712 signatures.
 */
contract APAYToken is
    Initializable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    // EIP-712 Typehashes for EIP-3009
    bytes32 public constant EIP712_DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

    bytes32 public constant TRANSFER_WITH_AUTHORIZATION_TYPEHASH =
        keccak256(
            "TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
        );

    bytes32 public constant RECEIVE_WITH_AUTHORIZATION_TYPEHASH =
        keccak256(
            "ReceiveWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
        );

    bytes32 public constant CANCEL_AUTHORIZATION_TYPEHASH =
        keccak256("CancelAuthorization(address authorizer,bytes32 nonce)");

    // EIP-3009 Nonce States: authorizer => nonce => used/canceled status
    mapping(address => mapping(bytes32 => bool)) private _authorizationStates;

    // Minter authorization
    mapping(address => bool) public isMinter;

    // Events
    event AuthorizationUsed(address indexed authorizer, bytes32 indexed nonce);
    event AuthorizationCanceled(address indexed authorizer, bytes32 indexed nonce);
    event MinterUpdated(address indexed minter, bool indexed status);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the proxy contract
     * @param initialOwner Address of contract owner & governance
     * @param initialSupply Initial supply minted to initialOwner
     */
    function initialize(address initialOwner, uint256 initialSupply) external initializer {
        __ERC20_init("AgentPay Token", "APAY");
        __ERC20Burnable_init();
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();

        _mint(initialOwner, initialSupply);
    }

    /**
     * @notice Set or revoke minter status for an address
     * @param minter Address to authorize or revoke
     * @param allowed True to authorize, false to revoke
     */
    function setMinter(address minter, bool allowed) external onlyOwner {
        require(minter != address(0), "APAY: invalid minter");
        isMinter[minter] = allowed;
        emit MinterUpdated(minter, allowed);
    }

    /**
     * @notice Mint additional APAY tokens (only owner or authorized minter)
     */
    function mint(address to, uint256 amount) external {
        require(msg.sender == owner() || isMinter[msg.sender], "APAY: unauthorized minter");
        _mint(to, amount);
    }

    /**
     * @notice Returns whether an authorization nonce has been used or canceled
     */
    function authorizationState(address authorizer, bytes32 nonce) external view returns (bool) {
        return _authorizationStates[authorizer][nonce];
    }

    /**
     * @notice Returns the EIP-712 Domain Separator for current chain
     */
    function DOMAIN_SEPARATOR() public view returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    EIP712_DOMAIN_TYPEHASH,
                    keccak256(bytes(name())),
                    keccak256(bytes("1")),
                    block.chainid,
                    address(this)
                )
            );
    }

    /**
     * @notice Execute a token transfer on behalf of the sender using a signed authorization
     */
    function transferWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        _requireValidAuthorization(from, nonce, validAfter, validBefore);

        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR(),
                keccak256(
                    abi.encode(
                        TRANSFER_WITH_AUTHORIZATION_TYPEHASH,
                        from,
                        to,
                        value,
                        validAfter,
                        validBefore,
                        nonce
                    )
                )
            )
        );

        address signer = ecrecover(digest, v, r, s);
        require(signer != address(0) && signer == from, "APAY: invalid signature");

        _authorizationStates[from][nonce] = true;
        emit AuthorizationUsed(from, nonce);

        _transfer(from, to, value);
    }

    /**
     * @notice Execute a token transfer to the caller using a signed authorization from sender
     */
    function receiveWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(to == msg.sender, "APAY: caller is not payee");
        _requireValidAuthorization(from, nonce, validAfter, validBefore);

        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR(),
                keccak256(
                    abi.encode(
                        RECEIVE_WITH_AUTHORIZATION_TYPEHASH,
                        from,
                        to,
                        value,
                        validAfter,
                        validBefore,
                        nonce
                    )
                )
            )
        );

        address signer = ecrecover(digest, v, r, s);
        require(signer != address(0) && signer == from, "APAY: invalid signature");

        _authorizationStates[from][nonce] = true;
        emit AuthorizationUsed(from, nonce);

        _transfer(from, to, value);
    }

    /**
     * @notice Cancel an unused authorization nonce
     */
    function cancelAuthorization(
        address authorizer,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(!_authorizationStates[authorizer][nonce], "APAY: authorization already used or canceled");

        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR(),
                keccak256(abi.encode(CANCEL_AUTHORIZATION_TYPEHASH, authorizer, nonce))
            )
        );

        address signer = ecrecover(digest, v, r, s);
        require(signer != address(0) && signer == authorizer, "APAY: invalid signature");

        _authorizationStates[authorizer][nonce] = true;
        emit AuthorizationCanceled(authorizer, nonce);
    }

    function _requireValidAuthorization(
        address authorizer,
        bytes32 nonce,
        uint256 validAfter,
        uint256 validBefore
    ) internal view {
        require(block.timestamp > validAfter, "APAY: authorization not yet valid");
        require(block.timestamp < validBefore, "APAY: authorization expired");
        require(!_authorizationStates[authorizer][nonce], "APAY: authorization already used or canceled");
    }

    /**
     * @notice UUPS Upgrade Authorization Function (Owner Only)
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
