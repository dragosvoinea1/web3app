// Variabile globale
let provider, signer, contract;

// Configurație contract
const contractAddress = "0xea1f3846E6DD538350f29fC96C842695E98D5cf9"; // Înlocuiește cu adresa contractului deployat
const adminAccount = "0xE510F0b4e6a6F5808C76C1ed161B3c21c963FAeC"; // Contul de admin
const contractABI = [
    {
        "inputs": [
            { "internalType": "address", "name": "user", "type": "address" },
            { "internalType": "uint256", "name": "points", "type": "uint256" }
        ],
        "name": "addReputation",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "user", "type": "address" }
        ],
        "name": "getReputation",
        "outputs": [
            { "internalType": "uint256", "name": "", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address payable", "name": "recipient", "type": "address" }
        ],
        "name": "sendEther",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
            { "indexed": false, "internalType": "uint256", "name": "points", "type": "uint256" }
        ],
        "name": "ReputationAdded",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "address", "name": "sender", "type": "address" },
            { "indexed": true, "internalType": "address", "name": "recipient", "type": "address" },
            { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
        ],
        "name": "EtherSent",
        "type": "event"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "user1", "type": "address" },
            { "internalType": "address", "name": "user2", "type": "address" }
        ],
        "name": "calculateAverageReputation",
        "outputs": [
            { "internalType": "uint256", "name": "", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "user1", "type": "address" },
            { "internalType": "address", "name": "user2", "type": "address" }
        ],
        "name": "calculateAverageEthBalance",
        "outputs": [
            { "internalType": "uint256", "name": "", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    }
    
];



// Referințe la elemente HTML
const connectButton = document.getElementById("connect");
const logoutButton = document.getElementById("logout");
const accountDisplay = document.getElementById("account");
const balanceDisplay = document.getElementById("balance");

// Eveniment pentru conectarea la MetaMask
connectButton.addEventListener("click", async () => {
    console.log("Connect button clicked");

    if (typeof window.ethereum === "undefined") {
        alert("MetaMask is not installed. Please install MetaMask and try again.");
        return;
    }

    try {
        // Conectare la MetaMask
        provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []); // Solicită permisiunea de a accesa conturile
        signer = provider.getSigner();

        // Afișează contul conectat
        const account = await signer.getAddress();
        console.log("Connected account:", account);
        accountDisplay.innerText = `Account: ${account}`;

        // Afișează balanța contului conectat
        const balance = await provider.getBalance(account);
        balanceDisplay.innerText = `Balance: ${ethers.utils.formatEther(balance)} ETH`;

        // Inițializează contractul
        if (!contract) {
            contract = new ethers.Contract(contractAddress, contractABI, signer);
        }

        // Actualizează butoanele
        connectButton.classList.add("d-none");
        logoutButton.classList.remove("d-none");

        // Ascultă evenimentele din contract
        listenToEvents();
    } catch (error) {
        console.error("Error connecting to MetaMask:", error);
        alert(`Failed to connect to MetaMask: ${error.message}`);
    }
});

// Eveniment pentru deconectarea de la MetaMask
logoutButton.addEventListener("click", () => {
    console.log("Logout button clicked");

    // Resetează starea UI
    accountDisplay.innerText = "Account: Not connected";
    balanceDisplay.innerText = "Balance: Not connected";

    // Actualizează butoanele
    logoutButton.classList.add("d-none");
    connectButton.classList.remove("d-none");

    // Curăță provider-ul și contractul
    provider = null;
    signer = null;
    contract = null;

    console.log("User logged out.");
});

// Verifică conexiunea la MetaMask înainte de a efectua orice acțiune
function ensureConnected() {
    if (!provider || !signer || !contract) {
        alert("Please connect to MetaMask first!");
        throw new Error("Not connected to MetaMask");
    }
}


// Funcții pentru localStorage
function saveHistoryToLocalStorage(history) {
    localStorage.setItem("transactionHistory", JSON.stringify(history));
}

function loadHistoryFromLocalStorage() {
    const history = localStorage.getItem("transactionHistory");
    return history ? JSON.parse(history) : [];
}

// Funcție pentru ascultarea evenimentelor
async function listenToEvents() {
    if (!contract) {
        console.error("Contract is not initialized");
        return;
    }

    // Obține contul conectat și verifică dacă este admin
    const account = await signer.getAddress();
    const isAdmin = account.toLowerCase() === adminAccount.toLowerCase();

    // Referință la lista istoricului
    const historyList = document.getElementById("history");

    if (isAdmin) {
        // Curăță orice mesaj pentru utilizatorii non-admin și afișează istoricul complet
        historyList.innerHTML = ""; // Golește istoricul
        console.log("Admin connected. Displaying transaction history...");

        // Încarcă istoricul existent din localStorage
        const existingHistory = loadHistoryFromLocalStorage();
        existingHistory.forEach((entry) => {
            const listItem = document.createElement("li");
            listItem.innerText = entry;
            historyList.appendChild(listItem);
        });
    } else {
        // Afișează mesaj pentru utilizatorii non-admin
        console.log("Non-admin user connected. Hiding transaction history.");
        historyList.innerHTML = "<li>Transaction history is only visible to the admin.</li>";
    }

    console.log("Listening to ReputationAdded...");
    contract.on("ReputationAdded", async (user, points, event) => {
        console.log(`ReputationAdded Event: User=${user}, Points=${points}, TxHash=${event.transactionHash}`);

        const entry = `Reputation Added: ${user} earned ${points} points. TxHash: ${event.transactionHash}`;

        // Salvează în localStorage
        const existingHistory = loadHistoryFromLocalStorage();
        const updatedHistory = [...existingHistory, entry];
        saveHistoryToLocalStorage(updatedHistory);

        // Actualizează UI-ul doar dacă utilizatorul este admin
        const currentAccount = await signer.getAddress();
        if (currentAccount.toLowerCase() === adminAccount.toLowerCase()) {
            const listItem = document.createElement("li");
            listItem.innerText = entry;
            historyList.appendChild(listItem);
        }
    });

    console.log("Listening to EtherSent...");
    contract.on("EtherSent", async (sender, recipient, amount, event) => {
        console.log(
            `EtherSent Event: Sender=${sender}, Recipient=${recipient}, Amount=${ethers.utils.formatEther(
                amount
            )}, TxHash=${event.transactionHash}`
        );

        const entry = `Ether Sent: ${sender} sent ${ethers.utils.formatEther(amount)} ETH to ${recipient}. TxHash: ${event.transactionHash}`;

        // Salvează în localStorage
        const existingHistory = loadHistoryFromLocalStorage();
        const updatedHistory = [...existingHistory, entry];
        saveHistoryToLocalStorage(updatedHistory);

        // Actualizează UI-ul doar dacă utilizatorul este admin
        const currentAccount = await signer.getAddress();
        if (currentAccount.toLowerCase() === adminAccount.toLowerCase()) {
            const listItem = document.createElement("li");
            listItem.innerText = entry;
            historyList.appendChild(listItem);
        }
    });
}



// Eveniment pentru apelarea funcției addReputation
document.getElementById("addReputation").addEventListener("click", async () => {
    const account = await signer.getAddress();
    if (!contract) {
        alert("Please connect to MetaMask first!");
        return;
    }
    if (account.toLowerCase() !== adminAccount.toLowerCase()) {
        alert("Only the admin can perform this action.");
        return;
    }

    try {
        const userAddress = document.getElementById("userAddress").value;
        const reputationPoints = document.getElementById("reputationPoints").value;

        if (!userAddress || !reputationPoints) {
            document.getElementById("status").innerText = "Please fill in all fields!";
            return;
        }

        console.log(`Calling addReputation for user: ${userAddress} with points: ${reputationPoints}`);

        // Apelează funcția addReputation din contract
        const tx = await contract.addReputation(userAddress, reputationPoints);
        document.getElementById("status").innerText = "Transaction sent. Waiting for confirmation...";
        await tx.wait(); // Așteaptă confirmarea tranzacției
        document.getElementById("status").innerText = "Reputation added successfully!";
    } catch (error) {
        console.error("Transaction failed:", error);
        document.getElementById("status").innerText = `Error: ${error.message}`;
    }
});

// Eveniment pentru apelarea funcției getReputation
document.getElementById("getReputation").addEventListener("click", async () => {
    const account = await signer.getAddress();
    if (!contract) {
        alert("Please connect to MetaMask first!");
        return;
    }
    if (account.toLowerCase() !== adminAccount.toLowerCase()) {
        alert("Only the admin can perform this action.");
        return;
    }

    try {
        const userAddress = document.getElementById("checkUserAddress").value;

        if (!userAddress) {
            document.getElementById("reputationResult").innerText = "Please enter a user address!";
            return;
        }

        console.log(`Fetching reputation for user: ${userAddress}`);

        // Apelează funcția getReputation din contract
        const reputation = await contract.getReputation(userAddress);
        document.getElementById("reputationResult").innerText = `Reputation: ${reputation}`;
    } catch (error) {
        console.error("Failed to fetch reputation:", error);
        document.getElementById("reputationResult").innerText = `Error: ${error.message}`;
    }
});

// Eveniment pentru apelarea funcției sendEther
document.getElementById("sendEther").addEventListener("click", async () => {
    const account = await signer.getAddress();
    if (!contract) {
        alert("Please connect to MetaMask first!");
        return;
    }
    if (account.toLowerCase() !== adminAccount.toLowerCase()) {
        alert("Only the admin can perform this action.");
        return;
    }

    try {
        const recipient = document.getElementById("recipientAddress").value;
        const amount = document.getElementById("ethAmount").value;

        if (!recipient || !amount) {
            document.getElementById("transferStatus").innerText = "Please fill in all fields!";
            return;
        }

        console.log(`Sending ${amount} ETH to: ${recipient}`);

        // Apelează funcția sendEther din contract
        const tx = await contract.sendEther(recipient, { value: ethers.utils.parseEther(amount) });
        document.getElementById("transferStatus").innerText = "Transaction sent. Waiting for confirmation...";
        await tx.wait(); // Așteaptă confirmarea tranzacției
        document.getElementById("transferStatus").innerText = "Ether sent successfully!";
    } catch (error) {
        console.error("Transaction failed:", error);
        document.getElementById("transferStatus").innerText = `Error: ${error.message}`;
    }
});

document.getElementById("calculateAverage").addEventListener("click", async () => {
    const account = await signer.getAddress();
    if (account.toLowerCase() !== adminAccount.toLowerCase()) {
        alert("Only the admin can perform this action.");
        return;
    }
    if (!contract) {
        alert("Please connect to MetaMask first!");
        return;
    }

    try {
        const user1Address = document.getElementById("user1Address").value;
        const user2Address = document.getElementById("user2Address").value;

        if (!user1Address || !user2Address) {
            document.getElementById("averageResult").innerText = "Please fill in both addresses!";
            return;
        }

        console.log(`Calculating average reputation for users: ${user1Address} and ${user2Address}`);

        // Apelează funcția `calculateAverageReputation` din contract
        const average = await contract.calculateAverageReputation(user1Address, user2Address);

        // Afișează rezultatul
        document.getElementById("averageResult").innerText = `Average Reputation: ${average}`;
    } catch (error) {
        console.error("Failed to calculate average reputation:", error);
        document.getElementById("averageResult").innerText = `Error: ${error.message}`;
    }
});

document.getElementById("calculateAverageEth").addEventListener("click", async () => {
    const account = await signer.getAddress();
    if (account.toLowerCase() !== adminAccount.toLowerCase()) {
        alert("Only the admin can perform this action.");
        return;
    }
    if (!contract) {
        alert("Please connect to MetaMask first!");
        return;
    }

    try {
        const user1Address = document.getElementById("ethUser1Address").value;
        const user2Address = document.getElementById("ethUser2Address").value;

        if (!user1Address || !user2Address) {
            document.getElementById("averageEthResult").innerText = "Please fill in both addresses!";
            return;
        }

        console.log(`Calculating average ETH balance for users: ${user1Address} and ${user2Address}`);

        // Apelează funcția `calculateAverageEthBalance` din contract
        const averageEth = await contract.calculateAverageEthBalance(user1Address, user2Address);

        // Afișează rezultatul
        document.getElementById("averageEthResult").innerText = `Average ETH Balance: ${ethers.utils.formatEther(averageEth)} ETH`;
    } catch (error) {
        console.error("Failed to calculate average ETH balance:", error);
        document.getElementById("averageEthResult").innerText = `Error: ${error.message}`;
    }
});



document.getElementById("clearHistory").addEventListener("click", () => {
    
    localStorage.removeItem("transactionHistory");
    document.getElementById("history").innerHTML = "";
});
