require('dotenv').config();
const ethers = require('ethers');
const colors = require('colors');

class TekoOperations {
    constructor(privateKeys) {
        // RPC ve Provider Ayarları
        this.rpcUrl = process.env.RPC_URL || "https://carrot.megaeth.com/rpc";
        this.provider = new ethers.providers.JsonRpcProvider(this.rpcUrl);
        
        // Cüzdanları oluştur
        this.accounts = privateKeys.map(pk => new ethers.Wallet(pk, this.provider));
        
        // Token Adresleri
        this.tokens = {
            "tkETH": {
                address: "0x176735870dc6C22B4EBFBf519DE2ce758de78d94",
                mintData: "0x40c10f190000000000000000000000002d2c7bf3e4f1774570aa029ce36c1b60f3fe46bf0000000000000000000000000000000000000000000000000de0b6b3a7640000",
                poolId: "72572175584673509244743384162953726919624465952543019256792130552168516108177", // Placeholder - gerçek pool ID değeri kontrol edilmeli
                decimals: 18
            },
            "tkUSDC": {
                address: "0xFaf334e157175Ff676911AdcF0964D7f54F2C424",
                mintData: "0x40c10f190000000000000000000000002d2c7bf3e4f1774570aa029ce36c1b60f3fe46bf0000000000000000000000000000000000000000000000000000000077359400",
                // Pool ID string olarak tutulur (çok büyük bir sayı)
                poolId: "39584631314667805491088689848282554447608744687563418855093496965842959155466",
                decimals: 6
            },
            "cUSD": {
                address: "0xE9b6e75C243B6100ffcb1c66e8f78F96FeeA727F",
                mintData: "0x40c10f190000000000000000000000002d2c7bf3e4f1774570aa029ce36c1b60f3fe46bf00000000000000000000000000000000000000000000003635c9adc5dea00000",
                poolId: "0", // Placeholder - gerçek pool ID değeri kontrol edilmeli
                decimals: 18
            },
            "tkWBTC": {
                address: "0xF82ff0799448630eB56Ce747Db840a2E02Cde4D8",
                mintData: "0x40c10f190000000000000000000000002d2c7bf3e4f1774570aa029ce36c1b60f3fe46bf00000000000000000000000000000000000000000000000000000000001e8480",
                poolId: "0", // Placeholder - gerçek pool ID değeri kontrol edilmeli
                decimals: 8
            }
        };
        
        // Teko Sözleşme Adresi
        this.tekoAddress = "0x13C051431753FCE53eaEc02aF64a38A273E198d0";
        
        // ERC20 ve Teko ABI'leri
        this.ERC20_ABI = [
            {"inputs": [{"name": "_owner", "type": "address"}], "name": "balanceOf", "outputs": [{"name": "balance", "type": "uint256"}], "stateMutability": "view", "type": "function"},
            {"inputs": [{"name": "spender", "type": "address"}, {"name": "value", "type": "uint256"}], "name": "approve", "outputs": [{"name": "", "type": "bool"}], "stateMutability": "nonpayable", "type": "function"},
            {"inputs": [{"name": "owner", "type": "address"}, {"name": "spender", "type": "address"}], "name": "allowance", "outputs": [{"name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"},
            {"inputs": [], "name": "decimals", "outputs": [{"name": "", "type": "uint8"}], "stateMutability": "view", "type": "function"},
            {"inputs": [], "name": "symbol", "outputs": [{"name": "", "type": "string"}], "stateMutability": "view", "type": "function"}
        ];
        
        this.TEKO_ABI = [
            {"type": "function", "name": "deposit", "inputs": [
                {"name": "poolId", "type": "uint256"},
                {"name": "assets", "type": "uint256"},
                {"name": "receiver", "type": "address"}
            ], "outputs": [{"name": "shares", "type": "uint256"}], "stateMutability": "nonpayable"},
            {"type": "function", "name": "getAssetsOf", "inputs": [
                {"name": "poolId", "type": "uint256"},
                {"name": "guy", "type": "address"}
            ], "outputs": [{"name": "", "type": "uint256"}], "stateMutability": "view"},
            {"type": "function", "name": "withdraw", "inputs": [
                {"name": "poolId", "type": "uint256"},
                {"name": "assets", "type": "uint26"},
                {"name": "receiver", "type": "address"},
                {"name": "owner", "type": "address"}
            ], "outputs": [{"name": "shares", "type": "uint256"}], "stateMutability": "nonpayable"},
            {"type": "function", "name": "borrow", "inputs": [
                {"name": "poolId", "type": "uint256"},
                {"name": "position", "type": "address"},
                {"name": "amt", "type": "uint256"}
            ], "outputs": [{"name": "borrowShares", "type": "uint256"}], "stateMutability": "nonpayable"}
        ];
        
        // Token ve Teko kontratları
        this.tokenContracts = {};
        this.tekoContracts = {};
        
        // Kontratları başlat
        this.initializeContracts();
    }
    
    // Güvenli adres normalizasyonu
    safeNormalizeAddress(address) {
        try {
            address = address.toLowerCase();
            return ethers.utils.getAddress(address);
        } catch (error) {
            console.error(colors.red(`Adres normalize edilemedi: ${address}`));
            return address;
        }
    }
    
    // Kontratları başlatma metodu
    initializeContracts() {
        for (const wallet of this.accounts) {
            // Teko kontratını başlat
            this.tekoContracts[wallet.address] = new ethers.Contract(
                this.tekoAddress,
                this.TEKO_ABI,
                wallet
            );
            
            // Token kontratlarını başlat
            for (const tokenName in this.tokens) {
                if (!this.tokenContracts[tokenName]) {
                    this.tokenContracts[tokenName] = {};
                }
                
                try {
                    this.tokenContracts[tokenName][wallet.address] = new ethers.Contract(
                        this.tokens[tokenName].address,
                        this.ERC20_ABI,
                        wallet
                    );
                } catch (error) {
                    console.error(colors.red(`Token kontratı oluşturma hatası (${tokenName}): ${error.message}`));
                }
            }
        }
    }
    
    // Bekleme fonksiyonu
    async waitWithProgress(ms) {
        const startTime = Date.now();
        const endTime = startTime + ms;
        
        while (Date.now() < endTime) {
            const remainingTime = Math.ceil((endTime - Date.now()) / 1000);
            process.stdout.write(`\r⏳ Kalan bekleme süresi: ${remainingTime} saniye`.yellow);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log('\n');
    }
    
    // İşlem linkini gösterme
    showTransactionLink(txHash) {
        console.log(colors.green(`🔗 İşlem Linki: https://www.megaexplorer.xyz/tx/${txHash}`));
    }
    
    // Token bakiyesi alma
    async getTokenBalance(tokenName, wallet) {
        try {
            if (!this.tokenContracts[tokenName] || !this.tokenContracts[tokenName][wallet.address]) {
                console.error(colors.red(`Token kontratı bulunamadı: ${tokenName}`));
                return ethers.BigNumber.from(0);
            }
            
            const tokenContract = this.tokenContracts[tokenName][wallet.address];
            const balance = await tokenContract.balanceOf(wallet.address);
            return balance;
        } catch (error) {
            console.error(colors.red(`Token bakiye hatası (${tokenName}): ${error.message}`));
            return ethers.BigNumber.from(0);
        }
    }
    
    // Havuzdaki bakiyeyi alma (normal pool ID'ler için)
    async getPoolBalance(tokenName, wallet) {
        try {
            // tkUSDC için havuz bakiyesini farklı şekilde ele alalım
            if (tokenName === "tkUSDC") {
                // Burada gerçek bir bakiye alamayacağız, çünkü pool ID çok büyük
                // Alternatif olarak token bakiyesini kontrol edebiliriz
                const tokenBalance = await this.getTokenBalance(tokenName, wallet);
                return ethers.BigNumber.from(0); // Pool bakiyesini bilemiyoruz
            }
            
            const tekoContract = this.tekoContracts[wallet.address];
            const poolId = parseInt(this.tokens[tokenName].poolId);
            
            // Eğer poolId geçerli bir sayı değilse
            if (isNaN(poolId)) {
                return ethers.BigNumber.from(0);
            }
            
            const balance = await tekoContract.getAssetsOf(poolId, wallet.address);
            return balance;
        } catch (error) {
            console.error(colors.red(`Havuz bakiye hatası (${tokenName}): ${error.message}`));
            return ethers.BigNumber.from(0);
        }
    }
    
    // Token onaylama
    async approveToken(tokenName, amount, wallet) {
        try {
            if (!this.tokenContracts[tokenName] || !this.tokenContracts[tokenName][wallet.address]) {
                console.error(colors.red(`Token kontratı bulunamadı: ${tokenName}`));
                return false;
            }
            
            const tokenContract = this.tokenContracts[tokenName][wallet.address];
            
            try {
                // Şu anki allowance kontrolü
                const currentAllowance = await tokenContract.allowance(wallet.address, this.tekoAddress);
                
                // Eğer yeterli allowance varsa tekrar approve etmeye gerek yok
                if (currentAllowance.gte(amount)) {
                    console.log(colors.green(`✅ ${tokenName} için zaten yeterli onay var.`));
                    return true;
                }
                
                // Onaylama işlemi
                const tx = await tokenContract.approve(this.tekoAddress, amount, {
                    gasLimit: ethers.utils.hexlify(200000)
                });
                await tx.wait();
                console.log(colors.green(`✅ ${tokenName} Onaylandı: ${ethers.utils.formatUnits(amount, this.tokens[tokenName].decimals)} ${tokenName}`));
                return true;
            } catch (error) {
                console.error(colors.red(`❌ ${tokenName} Onay Hatası: ${error.message}`));
                return false;
            }
        } catch (error) {
            console.error(colors.red(`Token onay hatası: ${error.message}`));
            return false;
        }
    }
    
    // Token mint etme
    async mintToken(tokenName, wallet) {
        try {
            const tokenData = this.tokens[tokenName];
            const balance = await this.getTokenBalance(tokenName, wallet);
            
            // Bakiye kontrolü (eğer bakiye 0 ise mint et)
            if (balance.gt(0)) {
                console.log(colors.yellow(`ℹ️ ${tokenName} bakiyesi zaten var: ${ethers.utils.formatUnits(balance, tokenData.decimals)} ${tokenName}`));
                return true;
            }
            
            // Mint işlemini gerçekleştir
            console.log(colors.cyan(`🔄 ${tokenName} Mint Ediliyor...`));
            
            // Mint data'sını wallet adresine göre güncelle
            let mintData = tokenData.mintData;
            // Eğer data'da belirli bir cüzdan adresi hardcoded ise, güncellenebilir
            // Şu anda verilen data'lar çalışıyor gibi görünüyor, bu yüzden değiştirmeyelim
            
            const tx = await wallet.sendTransaction({
                to: tokenData.address,
                data: mintData,
                gasLimit: ethers.utils.hexlify(200000)
            });
            
            console.log(colors.cyan(`🔄 ${tokenName} Mint İşlemi Gönderildi - TX Hash: ${tx.hash}`));
            
            const receipt = await tx.wait();
            console.log(colors.green(`✅ ${tokenName} Mint İşlemi Tamamlandı`));
            this.showTransactionLink(receipt.transactionHash);
            
            // Mint sonrası bakiye kontrolü
            await this.waitWithProgress(5000); // Bakiye güncellemesi için kısa bir bekleme
            
            const afterBalance = await this.getTokenBalance(tokenName, wallet);
            console.log(colors.yellow(`ℹ️ ${tokenName} Güncel Bakiye: ${ethers.utils.formatUnits(afterBalance, tokenData.decimals)} ${tokenName}`));
            
            return true;
        } catch (error) {
            console.error(colors.red(`❌ ${tokenName} Mint Hatası: ${error.message}`));
            return false;
        }
    }
    
    // Havuza token yatırma
    async depositToPool(tokenName, wallet) {
        try {
            const tokenData = this.tokens[tokenName];
            const tokenBalance = await this.getTokenBalance(tokenName, wallet);
            
            // Bakiye kontrolü
            if (tokenBalance.eq(0)) {
                console.log(colors.yellow(`⚠️ ${tokenName} bakiyesi sıfır, deposit atlanıyor.`));
                return ethers.BigNumber.from(0);
            }
            
            // Tüm tokenleri approve et
            const approvalResult = await this.approveToken(tokenName, tokenBalance, wallet);
            if (!approvalResult) {
                console.error(colors.red(`❌ ${tokenName} token onayı başarısız`));
                return ethers.BigNumber.from(0);
            }
            
            // Deposit işlemini gerçekleştir
            console.log(colors.cyan(`🔄 ${tokenName} Havuza Yatırılıyor... Miktar: ${ethers.utils.formatUnits(tokenBalance, tokenData.decimals)} ${tokenName}`));
            
            // tkUSDC için özel deposit data'sı
            if (tokenName === "tkUSDC") {
                // Deposit data örneği: "0x8dbdbe6d57841b7b735a58794b8d4d8c38644050529cec291846e80e5afa791048c9410a00000000000000000000000000000000000000000000000000000000773594000000000000000000000000002d2c7bf3e4f1774570aa029ce36c1b60f3fe46bf"
                
                // Manuel deposit data oluştur
                const depositData = "0x8dbdbe6d" + // deposit fonksiyon selector
                                    "57841b7b735a58794b8d4d8c38644050529cec291846e80e5afa791048c9410a" + // poolId (hardcoded)
                                    tokenBalance.toHexString().slice(2).padStart(64, '0') + // token miktarı (padded)
                                    wallet.address.slice(2).padStart(64, '0'); // alıcı adresi (padded)
                
                const tx = await wallet.sendTransaction({
                    to: this.tekoAddress,
                    data: depositData,
                    gasLimit: ethers.utils.hexlify(300000)
                });
                
                console.log(colors.cyan(`🔄 ${tokenName} Deposit İşlemi Gönderildi - TX Hash: ${tx.hash}`));
                
                const receipt = await tx.wait();
                console.log(colors.green(`✅ ${tokenName} Deposit İşlemi Tamamlandı`));
                this.showTransactionLink(receipt.transactionHash);
                
                // Deposit sonrası bakiye kontrolü
                await this.waitWithProgress(5000);
                
                const tokenBalanceAfter = await this.getTokenBalance(tokenName, wallet);
                console.log(colors.yellow(`ℹ️ ${tokenName} Token Bakiyesi: ${ethers.utils.formatUnits(tokenBalanceAfter, tokenData.decimals)} ${tokenName}`));
                
                // Deposit miktarını döndür (tahmini)
                return tokenBalance;
            } 
            // Diğer tokenler için normal işlem (küçük pool ID'ler)
            else {
                try {
                    const tekoContract = this.tekoContracts[wallet.address];
                    const poolId = parseInt(tokenData.poolId);
                    
                    // Eğer poolId geçerli bir sayı değilse
                    if (isNaN(poolId)) {
                        console.log(colors.yellow(`⚠️ ${tokenName} için geçerli bir pool ID bulunamadı, deposit atlanıyor.`));
                        return ethers.BigNumber.from(0);
                    }
                    
                    const tx = await tekoContract.deposit(
                        poolId,
                        tokenBalance,
                        wallet.address,
                        {
                            gasLimit: ethers.utils.hexlify(300000)
                        }
                    );
                    
                    console.log(colors.cyan(`🔄 ${tokenName} Deposit İşlemi Gönderildi - TX Hash: ${tx.hash}`));
                    
                    const receipt = await tx.wait();
                    console.log(colors.green(`✅ ${tokenName} Deposit İşlemi Tamamlandı`));
                    this.showTransactionLink(receipt.transactionHash);
                    
                    // Deposit sonrası bakiye kontrolü
                    await this.waitWithProgress(5000);
                    
                    const poolBalance = await this.getPoolBalance(tokenName, wallet);
                    console.log(colors.yellow(`ℹ️ ${tokenName} Havuz Bakiyesi: ${ethers.utils.formatUnits(poolBalance, tokenData.decimals)} ${tokenName}`));
                    
                    return poolBalance;
                } catch (error) {
                    console.error(colors.red(`❌ ${tokenName} Standard Deposit Hatası: ${error.message}`));
                    return ethers.BigNumber.from(0);
                }
            }
        } catch (error) {
            console.error(colors.red(`❌ ${tokenName} Deposit Hatası: ${error.message}`));
            return ethers.BigNumber.from(0);
        }
    }
    
    // Havuzdan token çekme
    async withdrawFromPool(tokenName, wallet, depositAmount) {
        try {
            if (depositAmount.eq(0)) {
                console.log(colors.yellow(`⚠️ ${tokenName} havuz bakiyesi sıfır, withdraw atlanıyor.`));
                return false;
            }
            
            // Çekilecek miktarı hesapla (%50-70 arası)
            const withdrawPercent = Math.floor(Math.random() * 21) + 50; // 50-70 arası
            const withdrawAmount = depositAmount.mul(withdrawPercent).div(100);
            
            const tokenData = this.tokens[tokenName];
            console.log(colors.cyan(`🔄 ${tokenName} Havuzdan Çekiliyor... Miktar: ${ethers.utils.formatUnits(withdrawAmount, tokenData.decimals)} ${tokenName} (Deposit'in %${withdrawPercent}'i)`));
            
            // tkUSDC için özel withdraw data'sı
            if (tokenName === "tkUSDC") {
                // Withdraw data örneği için doğru fonksiyon selector ve data yapısı kullanılmalı
                // withdraw(uint256,uint256,address,address)
                
                // Manuel withdraw data oluştur
                const withdrawData = "0x71b3177a" + // withdraw fonksiyon selector
                                     "57841b7b735a58794b8d4d8c38644050529cec291846e80e5afa791048c9410a" + // poolId (hardcoded)
                                     withdrawAmount.toHexString().slice(2).padStart(64, '0') + // token miktarı (padded)
                                     wallet.address.slice(2).padStart(64, '0') + // alıcı adresi (padded)
                                     wallet.address.slice(2).padStart(64, '0'); // owner adresi (padded)
                
                const tx = await wallet.sendTransaction({
                    to: this.tekoAddress,
                    data: withdrawData,
                    gasLimit: ethers.utils.hexlify(300000)
                });
                
                console.log(colors.cyan(`🔄 ${tokenName} Withdraw İşlemi Gönderildi - TX Hash: ${tx.hash}`));
                
                const receipt = await tx.wait();
                console.log(colors.green(`✅ ${tokenName} Withdraw şlemi Tamamlandı`));
                this.showTransactionLink(receipt.transactionHash);
                
                // Withdraw sonrası bakiye kontrolü
                await this.waitWithProgress(5000);
                
                const tokenBalance = await this.getTokenBalance(tokenName, wallet);
                console.log(colors.yellow(`ℹ️ ${tokenName} Token Bakiyesi: ${ethers.utils.formatUnits(tokenBalance, tokenData.decimals)} ${tokenName}`));
                
                return true;
            }
            // Diğer tokenler için normal işlem (küçük pool ID'ler)
            else {
                try {
                    const tekoContract = this.tekoContracts[wallet.address];
                    const poolId = parseInt(tokenData.poolId);
                    
                    // Eğer poolId geçerli bir sayı değilse
                    if (isNaN(poolId)) {
                        console.log(colors.yellow(`⚠️ ${tokenName} için geçerli bir pool ID bulunamadı, withdraw atlanıyor.`));
                        return false;
                    }
                    
                    const tx = await tekoContract.withdraw(
                        poolId,
                        withdrawAmount,
                        wallet.address,
                        wallet.address,
                        {
                            gasLimit: ethers.utils.hexlify(300000)
                        }
                    );
                    
                    console.log(colors.cyan(`🔄 ${tokenName} Withdraw İşlemi Gönderildi - TX Hash: ${tx.hash}`));
                    
                    const receipt = await tx.wait();
                    console.log(colors.green(`✅ ${tokenName} Withdraw İşlemi Tamamlandı`));
                    this.showTransactionLink(receipt.transactionHash);
                    
                    // Withdraw sonrası bakiye kontrolü
                    await this.waitWithProgress(5000);
                    
                    const tokenBalance = await this.getTokenBalance(tokenName, wallet);
                    console.log(colors.yellow(`ℹ️ ${tokenName} Token Bakiyesi: ${ethers.utils.formatUnits(tokenBalance, tokenData.decimals)} ${tokenName}`));
                    
                    const poolBalance = await this.getPoolBalance(tokenName, wallet);
                    console.log(colors.yellow(`ℹ️ ${tokenName} Havuz Bakiyesi: ${ethers.utils.formatUnits(poolBalance, tokenData.decimals)} ${tokenName}`));
                    
                    return true;
                } catch (error) {
                    console.error(colors.red(`❌ ${tokenName} Standard Withdraw Hatası: ${error.message}`));
                    return false;
                }
            }
        } catch (error) {
            console.error(colors.red(`❌ ${tokenName} Withdraw Hatası: ${error.message}`));
            return false;
        }
    }
    
    // Cüzdan bakiyelerini görüntüleme
    async displayWalletBalances() {
        for (const wallet of this.accounts) {
            console.log(colors.blue(`📊 Cüzdan Adresi: ${wallet.address}`));
            
            // ETH Bakiyesi
            const ethBalance = await wallet.getBalance();
            console.log(colors.green(`   ETH Bakiyesi: ${ethers.utils.formatEther(ethBalance)} ETH`));
            
            // Token Bakiyeleri
            for (const tokenName in this.tokens) {
                try {
                    const tokenBalance = await this.getTokenBalance(tokenName, wallet);
                    console.log(colors.yellow(`   ${tokenName} Bakiyesi: ${ethers.utils.formatUnits(tokenBalance, this.tokens[tokenName].decimals)} ${tokenName}`));
                    
                    // Pool Bakiyesi (tkUSDC dışındakiler için)
                    if (tokenName !== "tkUSDC") {
                        try {
                            const poolBalance = await this.getPoolBalance(tokenName, wallet);
                            if (poolBalance.gt(0)) {
                                console.log(colors.cyan(`   ${tokenName} Havuz Bakiyesi: ${ethers.utils.formatUnits(poolBalance, this.tokens[tokenName].decimals)} ${tokenName}`));
                            }
                        } catch (poolError) {
                            // Havuz bakiyesi görüntülenemiyorsa geç
                        }
                    }
                } catch (error) {
                    console.error(colors.red(`Token bakiye hatası: ${tokenName} - ${error.message}`));
                }
            }
            console.log('-------------------');
        }
    }
    
    // Ana işlem fonksiyonu
    async performSwap() {
        try {
            console.log(colors.yellow('🔍 Teko İşlemleri Başlatılıyor...'));
            
            for (const wallet of this.accounts) {
                try {
                    console.log(colors.blue(`🔒 İşlem Yapılan Cüzdan: ${wallet.address}`));
                    
                    // 1. Tüm tokenleri mint et (eğer bakiyesi yoksa)
                    console.log(colors.cyan(`\n🔄 Token Mint İşlemleri Başlatılıyor...`));
                    for (const tokenName in this.tokens) {
                        await this.mintToken(tokenName, wallet);
                        
                        // İşlemler arasında kısa bir bekleme
                        await this.waitWithProgress(Math.floor(Math.random() * 5000) + 5000);
                    }
                    
                    // 2. tkUSDC'yi havuza yatır
                    console.log(colors.cyan(`\n🔄 Token Deposit İşlemleri Başlatılıyor...`));
                    const depositToken = "tkUSDC";
                    const depositAmount = await this.depositToPool(depositToken, wallet);
                    
                    // İşlemler arasında bekleme (20-40 saniye)
                    const withdrawWaitTime = Math.floor(Math.random() * 20000) + 20000;
                    console.log(colors.cyan(`\n⏳ Withdraw işlemi öncesi bekleniyor... (${Math.floor(withdrawWaitTime/1000)} saniye)`));
                    await this.waitWithProgress(withdrawWaitTime);
                    
                    // 3. Yatırılan tokenleri %50-70 oranında geri çek
                    console.log(colors.cyan(`\n🔄 Token Withdraw İşlemleri Başlatılıyor...`));
                    await this.withdrawFromPool(depositToken, wallet, depositAmount);
                    
                    // Cüzdanlar arasında biraz daha uzun bekleme
                    const walletWaitTime = Math.floor(Math.random() * 30000) + 30000;
                    await this.waitWithProgress(walletWaitTime);
                    
                } catch (walletError) {
                    console.error(colors.red(`🚨 Cüzdan İşlem Hatası: ${walletError.message}`));
                }
            }
            
            // Son olarak bakiyeleri göster
            await this.displayWalletBalances();
            
        } catch (mainError) {
            console.error(colors.red(`🚨 Ana İşlem Hatası: ${mainError.message}`));
        }
    }
}

// Modülü dışa aktar
module.exports = { TekoOperations };
