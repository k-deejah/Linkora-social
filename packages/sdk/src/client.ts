import { NotFoundError } from "./errors";
import { GeneratedLinkoraClient } from "./generated/client";
import type { Profile, Post, Pool, GovParameter, GovProposal } from "./types";

const DEFAULT_NETWORK = "Test SDF Network ; September 2015";

/**
 * Configuration options for the SDK client
 */
export interface ClientConfig {
  contractId: string;
  rpcUrl: string;
  networkPassphrase?: string;
}

/**
 * Typed client for all Linkora social contract methods.
 *
 * Extends the auto-generated GeneratedLinkoraClient with connection management,
 * error handling, and type conversions (e.g. bigint ↔ number).
 */
export class LinkoraClient extends GeneratedLinkoraClient {
  constructor(config: ClientConfig) {
    super({
      contractId: config.contractId,
      rpcUrl: config.rpcUrl,
      networkPassphrase: config.networkPassphrase || DEFAULT_NETWORK,
    });
  }

  // ── Override read methods with error handling ─────────────────────────────

  async getProfile(address: string): Promise<Profile | null> {
    try {
      return await super.getProfile(address);
    } catch (e) {
      if (e instanceof NotFoundError) return null;
      throw e;
    }
  }

  async getProfileCount(): Promise<number> {
    const val = await super.getProfileCount();
    return Number(val);
  }

  async getPost(postId: number): Promise<Post | null> {
    try {
      return await super.getPost(BigInt(postId));
    } catch (e) {
      if (e instanceof NotFoundError) return null;
      throw e;
    }
  }

  async getPostCount(): Promise<number> {
    const val = await super.getPostCount();
    return Number(val);
  }

  async getLikeCount(postId: number): Promise<number> {
    const val = await super.getLikeCount(BigInt(postId));
    return Number(val);
  }

  async getTreasury(): Promise<string | null> {
    try {
      return await super.getTreasury();
    } catch {
      return null;
    }
  }

  async getPool(poolId: string): Promise<Pool | null> {
    try {
      return await super.getPool(poolId);
    } catch (e) {
      if (e instanceof NotFoundError) return null;
      throw e;
    }
  }

  // ── DM key methods ───────────────────────────────────────────────────────

  async getDmKey(address: string): Promise<Uint8Array | null> {
    try {
      return await super.getDmKey(address);
    } catch {
      return null;
    }
  }

  /**
   * Publish a user's X25519 public key for encrypted direct messages.
   */
  publishDmKey(user: string, x25519PubKey: Uint8Array): string {
    if (x25519PubKey.length !== 32) {
      throw new Error("X25519 public key must be exactly 32 bytes");
    }
    return super.publishDmKey(user, x25519PubKey);
  }

  // ── Governance convenience overrides ──────────────────────────────────────

  govPropose(
    proposer: string,
    parameter: GovParameter,
    newValue: number | bigint,
    newAddress: string | null
  ): string {
    return super.govPropose(proposer, parameter, BigInt(newValue), newAddress);
  }

  govVote(voter: string, proposalId: number, support: boolean): string {
    return super.govVote(voter, BigInt(proposalId), support);
  }

  govExecute(proposalId: number): string {
    return super.govExecute(BigInt(proposalId));
  }

  govGetProposal(proposalId: number): Promise<GovProposal> {
    return super.govGetProposal(BigInt(proposalId));
  }

  effectiveQuorum(proposalId: number): Promise<number> {
    return super.effectiveQuorum(BigInt(proposalId));
  }

  govVeto(signers: string[], poolId: string, proposalId: number): string {
    return super.govVeto(signers, poolId, BigInt(proposalId));
  }

  // ── Override write methods with number→bigint conversions ─────────────────

  deletePost(author: string, postId: number): string {
    return super.deletePost(author, BigInt(postId));
  }

  likePost(user: string, postId: number): string {
    return super.likePost(user, BigInt(postId));
  }

  tip(tipper: string, postId: number, token: string, amount: number | bigint): string {
    return super.tip(tipper, BigInt(postId), token, BigInt(amount));
  }

  poolDeposit(depositor: string, poolId: string, token: string, amount: number | bigint): string {
    return super.poolDeposit(depositor, poolId, token, BigInt(amount));
  }

  poolWithdraw(
    signers: string[],
    poolId: string,
    amount: number | bigint,
    recipient: string
  ): string {
    return super.poolWithdraw(signers, poolId, BigInt(amount), recipient);
  }
}
