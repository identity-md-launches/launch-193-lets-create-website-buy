// Browser-only interaction fixture. Never imported by the application.
// Every request is handled locally; no signature or transaction is broadcast.
(() => {
  const account = "0x1111111111111111111111111111111111111111";
  const token = "0xd34a99bc0f67ae1bbd63c660e6d0b0dd03e263b7";
  const router = "0x66a9893cc07d91d95644aedd05d03f95e1dba8af";
  const permit = "0x000000000022d473030f116ddee9f6b43ac78ba3";
  const quoter = "0x52f0e24d1c21c8a0cb1e5a5dd6198556bd9e1203";
  const word = (n) => BigInt(n).toString(16).padStart(64, "0");
  const packed = (...values) => "0x" + values.map(word).join("");
  const listeners = {};
  const test = (window.__imdTest = {
    account,
    chain: "0xaa36a7",
    rejectConnect: false,
    rejectSend: false,
    failReads: false,
    receipt: "success",
    transactions: [],
    approvedToken: 0n,
    approvedRouter: 0n,
    balance: 2n * 10n ** 18n,
    emit(event, value) {
      (listeners[event] || []).forEach((fn) => fn(value));
    },
  });
  window.ethereum = {
    on(event, fn) {
      (listeners[event] ||= []).push(fn);
    },
    removeListener(event, fn) {
      listeners[event] = (listeners[event] || []).filter((f) => f !== fn);
    },
    async request({ method, params = [] }) {
      if (method === "eth_requestAccounts") {
        if (test.rejectConnect)
          throw Object.assign(new Error("User rejected"), { code: 4001 });
        return [test.account];
      }
      if (method === "eth_accounts") return [test.account];
      if (method === "eth_chainId") return test.chain;
      if (method === "wallet_switchEthereumChain") {
        test.chain = params[0].chainId;
        test.emit("chainChanged", test.chain);
        return null;
      }
      if (test.failReads) throw new Error("Fixture: network unavailable");
      if (method === "eth_getBalance") return "0x" + test.balance.toString(16);
      if (method === "eth_blockNumber") return "0x3e8";
      if (method === "eth_gasPrice") return "0x3b9aca00";
      if (method === "eth_estimateGas") return "0x493e0";
      if (method === "eth_call") {
        const tx = params[0],
          to = tx.to.toLowerCase(),
          data = tx.data;
        if (to === router) return "0x";
        if (to === token && data.startsWith("0x70a08231"))
          return packed(1000n * 10n ** 18n);
        if (to === token && data.startsWith("0xdd62ed3e"))
          return packed(test.approvedToken);
        if (to === token) return packed(1);
        if (to === permit)
          return packed(
            test.approvedRouter,
            Math.floor(Date.now() / 1000) + 3600,
            0,
          );
        if (to === quoter) {
          const words = data.slice(10).match(/.{64}/g);
          const buy = BigInt("0x" + words[6]) === 1n;
          const amount = BigInt("0x" + words[7]);
          return packed(buy ? amount * 300n : amount / 300n, 200000);
        }
        // StateView getSlot0 has four outputs; getLiquidity decodes the first.
        return packed(2n ** 96n, 0, 0, 10000);
      }
      if (method === "eth_sendTransaction") {
        if (test.rejectSend)
          throw Object.assign(new Error("User rejected"), { code: 4001 });
        const tx = params[0];
        const hash =
          "0x" + String(test.transactions.length + 1).padStart(64, "a");
        test.transactions.push({ ...tx, hash });
        return hash;
      }
      if (method === "eth_getTransactionReceipt") {
        if (test.receipt === "pending") return null;
        const tx = test.transactions.find((t) => t.hash === params[0]);
        if (!tx) return null;
        if (test.receipt === "success" && tx.to.toLowerCase() === token)
          test.approvedToken = BigInt("0x" + tx.data.slice(-64));
        if (test.receipt === "success" && tx.to.toLowerCase() === permit)
          test.approvedRouter = BigInt(
            "0x" + tx.data.slice(10 + 128, 10 + 192),
          );
        return {
          transactionHash: tx.hash,
          blockHash: "0x" + "b".repeat(64),
          blockNumber: "0x3e8",
          transactionIndex: "0x0",
          from: account,
          to: tx.to,
          gasUsed: "0x5208",
          cumulativeGasUsed: "0x5208",
          effectiveGasPrice: "0x3b9aca00",
          logs: [],
          logsBloom: "0x" + "0".repeat(512),
          contractAddress: null,
          status: test.receipt === "success" ? "0x1" : "0x0",
          type: "0x2",
        };
      }
      if (method === "eth_getTransactionByHash") {
        const tx = test.transactions.find((t) => t.hash === params[0]);
        return tx
          ? {
              ...tx,
              input: tx.data,
              from: account,
              nonce: "0x0",
              gas: "0x493e0",
              gasPrice: "0x3b9aca00",
              value: tx.value || "0x0",
              blockHash: "0x" + "b".repeat(64),
              blockNumber: "0x3e8",
              transactionIndex: "0x0",
              type: "0x0",
              v: "0x1b",
              r: "0x1",
              s: "0x1",
            }
          : null;
      }
      throw new Error("Fixture refused unexpected method: " + method);
    },
  };
})();
