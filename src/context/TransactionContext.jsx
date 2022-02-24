import React, { useState, useEffect } from "react";
import { ethers } from "ethers";

import { contractABI, contractAddress } from "../utils/constants";

export const TransactionContext = React.createContext();

const { ethereum } = window;

const getEthereumContract = () => {
  const provider = new ethers.providers.Web3Provider(ethereum);
  const signer = provider.getSigner();
  const transactionContract = new ethers.Contract(
    contractAddress,
    contractABI,
    signer
  );

  return transactionContract;
};

export const TransactionProvider = ({ children }) => {
  const [currentAccount, setCurrentAccount] = useState("");
  const [formData, setFormData] = useState({
    addressTo: "",
    amount: "",
    keyword: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [transactionCount, setTransactionCount] = useState(
    localStorage.getItem("transactionCount")
  );
  const [transactions, setTransactions] = useState([]);

  const handleChange = (e, name) => {
    setFormData((prevState) => ({ ...prevState, [name]: e.target.value }));
  };

  const getAllTransactions = async () => {
    try {
      if (!ethereum) return alert("Please install metamask");

      const transactionsContract = getEthereumContract();
      const availableTransactions =
        await transactionsContract.getAllTransactions();

      const structuredTransactions = availableTransactions.map(
        (tranasaction) => ({
          addressTo: tranasaction.receiver,
          addressFrom: tranasaction.sender,
          timestamp: new Date(
            tranasaction.timestamp.toNumber() * 1000
          ).toLocaleString(),
          message: tranasaction.message,
          keyword: tranasaction.keyword,
          amount: parseInt(tranasaction.amount._hex) / 10 ** 18,
        })
      );

      setTransactions(structuredTransactions);
    } catch (error) {
      throw new Error("No ethereum object");
    }
  };

  const checkIfWalletIsConnected = async () => {
    try {
      if (!ethereum) return alert("Please install MetaMask");

      const accounts = await ethereum.request({ method: "eth_accounts" });

      if (accounts.length) {
        setCurrentAccount(accounts[0]);

        getAllTransactions();
      } else {
        console.log("No accounts found");
      }

      console.log(accounts);
    } catch (error) {
      console.error(error);
      throw new Error("No ethereum object");
    }
  };

  const checkIfTransactionExist = async () => {
    try {
      const transactionsContract = getEthereumContract();
      const transactionsCount =
        await transactionsContract.getTransactionCount();

      window.localStorage.setItem("transactionCount", transactionsCount);
    } catch (error) {
      console.error(error);
      throw new Error("No ethereum object");
    }
  };

  const connectWallet = async () => {
    try {
      if (!ethereum) return alert("Please install MetaMask");

      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });

      setCurrentAccount(accounts[0]);
    } catch (error) {
      console.error(error);
      throw new Error("No ethereum object");
    }
  };

  const sendTransaction = async () => {
    try {
      if (ethereum) {
        const { addressTo, amount, keyword, message } = formData;
        const transactionsContract = getEthereumContract();
        const parsedAmount = ethers.utils.parseEther(amount);

        await ethereum.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: currentAccount,
              to: addressTo,
              gas: "0x5208",
              value: parsedAmount._hex,
            },
          ],
        });

        const transactionHash = await transactionsContract.addToBlockChain(
          addressTo,
          parsedAmount,
          message,
          keyword
        );

        setLoading(true);
        await transactionHash.wait();
        setLoading(false);

        const transactionsCount =
          await transactionsContract.getTransactionCount();

        setTransactionCount(transactionsCount.toNumber());
        window.location.reload();
      } else {
        console.log("No ethereum object");
      }
    } catch (error) {
      console.log(error);

      throw new Error("No ethereum object");
    }
  };

  useEffect(() => {
    checkIfWalletIsConnected();
    checkIfTransactionExist();
  }, []);

  return (
    <TransactionContext.Provider
      value={{
        connectWallet,
        currentAccount,
        formData,
        setFormData,
        handleChange,
        sendTransaction,
        transactions,
        loading,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
};
