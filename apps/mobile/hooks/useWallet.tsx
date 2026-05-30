import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import * as secureStorage from "../utils/secureStorage";

// Mock Stellar Wallet Kit types for now
interface WalletKit {
  connect(): Promise<{ publicKey: string }>;
  disconnect(): Promise<void>;
  getPublicKey(): Promise<string>;
  isConnected(): Promise<boolean>;
  onAccountChange(callback: (account: string | null) => void): void;
  onNetworkChange(callback: (network: string) => void): void;
}

export type WalletState = "loading" | "disconnected" | "connecting" | "connected" | "error";

export interface WalletInfo {
  address: string | null;
  network: string | null;
}

interface ConnectionState {
  connected: boolean;
  address: string;
  timestamp: number;
}

interface WalletContextType {
  state: WalletState;
  wallet: WalletInfo;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function useWallet(): WalletContextType {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps): JSX.Element {
  const [state, setState] = useState<WalletState>("loading");
  const [wallet, setWallet] = useState<WalletInfo>({
    address: null,
    network: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [walletKit, setWalletKit] = useState<WalletKit | null>(null);

  // Initialize wallet kit
  useEffect(() => {
    const initWalletKit = async () => {
      try {
        // In a real implementation, this would import and initialize Stellar Wallet Kit
        const { WalletKit } = await import("@stellar/wallet-kit");
        const kit = new WalletKit() as WalletKit;
        setWalletKit(kit);
      } catch (err) {
        console.error("Failed to initialize wallet kit:", err);
        setState("error");
        setError("Wallet kit not available");
      }
    };

    initWalletKit();
  }, []);

  // Check connection state on initialization
  const checkConnectionState = useCallback(async () => {
    if (!walletKit) return;

    try {
      setState("loading");
      setError(null);

      // Check if we have stored connection state
      const storedAddress = await secureStorage.getWalletAddress();
      const storedConnectionState = await secureStorage.getConnectionState();

      if (storedAddress && storedConnectionState) {
        // Verify the connection is still valid
        const isConnected = await walletKit.isConnected();

        if (isConnected) {
          const currentAddress = await walletKit.getPublicKey();

          if (currentAddress === storedAddress) {
            // Connection is valid, restore state
            setWallet({
              address: currentAddress,
              network: "TESTNET", // TODO: Get actual network
            });
            setState("connected");
            return;
          }
        }

        // Connection is stale, clear stored state
        await secureStorage.deleteWalletAddress();
        await secureStorage.deleteConnectionState();
      }

      // No valid connection
      setState("disconnected");
      setWallet({ address: null, network: null });
    } catch (err) {
      console.error("Error checking connection state:", err);
      setState("error");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, [walletKit]);

  // Initialize connection state when wallet kit is ready
  useEffect(() => {
    if (walletKit) {
      checkConnectionState();
    }
  }, [walletKit, checkConnectionState]);

  const connect = useCallback(async () => {
    if (!walletKit) {
      setError("Wallet kit not available");
      setState("error");
      return;
    }

    try {
      setState("connecting");
      setError(null);

      // Attempt to connect
      const result = await walletKit.connect();
      const address = result.publicKey;

      if (!address) {
        throw new Error("No address returned from wallet");
      }

      // Store connection state
      const connectionState: ConnectionState = {
        connected: true,
        address,
        timestamp: Date.now(),
      };

      await Promise.all([
        secureStorage.setWalletAddress(address),
        secureStorage.setConnectionState(connectionState),
      ]);

      // Update context state
      setWallet({
        address,
        network: "TESTNET", // TODO: Get actual network
      });
      setState("connected");
    } catch (err) {
      console.error("Connection failed:", err);
      setState("error");
      setError(err instanceof Error ? err.message : "Connection failed");

      // Clear any partial state
      setWallet({ address: null, network: null });
    }
  }, [walletKit]);

  const disconnect = useCallback(async () => {
    if (!walletKit) return;

    try {
      setError(null);

      // Disconnect from wallet
      await walletKit.disconnect();

      // Clear stored state
      await Promise.all([
        secureStorage.deleteWalletAddress(),
        secureStorage.deleteConnectionState(),
      ]);

      // Update context state
      setWallet({ address: null, network: null });
      setState("disconnected");
    } catch (err) {
      console.error("Disconnect failed:", err);
      // Even if disconnect fails, clear local state
      setWallet({ address: null, network: null });
      setState("disconnected");

      // Clear stored state anyway
      await Promise.all([
        secureStorage.deleteWalletAddress(),
        secureStorage.deleteConnectionState(),
      ]);
    }
  }, [walletKit]);

  const refresh = useCallback(async () => {
    await checkConnectionState();
  }, [checkConnectionState]);

  const contextValue: WalletContextType = {
    state,
    wallet,
    error,
    connect,
    disconnect,
    refresh,
  };

  return <WalletContext.Provider value={contextValue}>{children}</WalletContext.Provider>;
}
